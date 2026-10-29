package com.twinatlas.annotation;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AnnotationRaceTest {

  static final int CLIENTS = 8;

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;

  @Test
  void concurrentCreatesOfTheSameTitleProduceExactlyOneAnnotation() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    String body =
        "{\"kind\":\"MARKER\",\"title\":\"Contested\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[2.175,41.405]}}";
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(CLIENTS);
    try {
      List<Future<Integer>> futures = new ArrayList<>();
      for (int i = 0; i < CLIENTS; i++) {
        Callable<Integer> client =
            () -> {
              start.await();
              return mvc.post()
                  .uri("/api/scenes/{id}/annotations", scene)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(body)
                  .exchange()
                  .getResponse()
                  .getStatus();
            };
        futures.add(pool.submit(client));
      }
      start.countDown();
      List<Integer> statuses = new ArrayList<>();
      for (Future<Integer> future : futures) {
        statuses.add(future.get());
      }

      assertThat(statuses).filteredOn(status -> status == 201).hasSize(1);
      assertThat(statuses).filteredOn(status -> status == 409).hasSize(CLIENTS - 1);
    } finally {
      pool.shutdownNow();
    }

    Integer rows =
        jdbc.sql("SELECT count(*) FROM annotation WHERE scene_id = :s")
            .param("s", scene)
            .query(Integer.class)
            .single();
    assertThat(rows).isEqualTo(1);
  }
}
