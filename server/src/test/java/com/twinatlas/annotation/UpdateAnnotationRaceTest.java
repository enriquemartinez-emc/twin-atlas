package com.twinatlas.annotation;

import static com.twinatlas.annotation.AnnotationApi.marker;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import com.jayway.jsonpath.JsonPath;
import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import com.twinatlas.annotation.core.UpdateContext;
import com.twinatlas.annotation.persistence.AnnotationFacts;
import java.nio.charset.StandardCharsets;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Updates that race: the version and the unique title index each have the last word. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class UpdateAnnotationRaceTest {

  static final int CLIENTS = 8;

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @MockitoSpyBean AnnotationFacts facts;

  private UUID idOf(MvcTestResult result) {
    return UUID.fromString(
        JsonPath.read(
            new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8),
            "$.id"));
  }

  private int status(UUID scene, UUID id, String ifMatch, String title) {
    return mvc.patch()
        .uri("/api/scenes/{scene}/annotations/{id}", scene, id)
        .header("If-Match", ifMatch)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"title\":\"" + title + "\"}")
        .exchange()
        .getResponse()
        .getStatus();
  }

  private List<Integer> concurrently(List<Callable<Integer>> clients, CountDownLatch start)
      throws Exception {
    ExecutorService pool = Executors.newFixedThreadPool(clients.size());
    try {
      List<Future<Integer>> futures = new ArrayList<>();
      for (Callable<Integer> client : clients) futures.add(pool.submit(client));
      start.countDown();
      List<Integer> statuses = new ArrayList<>();
      for (Future<Integer> future : futures) statuses.add(future.get());
      return statuses;
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void manyClientsUpdatingFromTheSameVersionLetExactlyOneWin() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    UUID id = idOf(marker(mvc, scene, "Contested", 2.175, 41.405));
    CountDownLatch start = new CountDownLatch(1);
    List<Callable<Integer>> clients = new ArrayList<>();
    for (int i = 0; i < CLIENTS; i++) {
      String title = "Winner candidate " + i;
      clients.add(
          () -> {
            start.await();
            return status(scene, id, "\"0\"", title);
          });
    }

    List<Integer> statuses = concurrently(clients, start);

    // Late arrivals see version 1 and are 412 (a pure rule); a true overlap is 409 (the version
    // column).
    assertThat(statuses).filteredOn(s -> s == 200).hasSize(1);
    assertThat(statuses).filteredOn(s -> s != 200).allMatch(s -> s == 412 || s == 409);
    Long version =
        jdbc.sql("SELECT version FROM annotation WHERE id = :id")
            .param("id", id)
            .query(Long.class)
            .single();
    assertThat(version).isEqualTo(1);
  }

  @Test
  void twoAnnotationsRenamedToTheSameTitleAtOnceLeaveOneOwner() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    UUID first = idOf(marker(mvc, scene, "First", 2.175, 41.405));
    UUID second = idOf(marker(mvc, scene, "Second", 2.176, 41.406));
    CountDownLatch start = new CountDownLatch(1);
    List<Callable<Integer>> clients =
        List.of(
            () -> {
              start.await();
              return status(scene, first, "\"0\"", "Wanted");
            },
            () -> {
              start.await();
              return status(scene, second, "\"0\"", "Wanted");
            });

    List<Integer> statuses = concurrently(clients, start);

    assertThat(statuses).containsExactlyInAnyOrder(200, 409);
    Integer owners =
        jdbc.sql("SELECT count(*) FROM annotation WHERE scene_id = :s AND title = 'Wanted'")
            .param("s", scene)
            .query(Integer.class)
            .single();
    assertThat(owners).isEqualTo(1);
  }

  @Test
  void aStaleTitleFactIsStillCaughtByTheUniqueIndex() {
    UUID scene = TestScenes.createScene(mvc);
    idOf(marker(mvc, scene, "Taken", 2.175, 41.405));
    UUID other = idOf(marker(mvc, scene, "Other", 2.176, 41.406));
    // Simulate the race deterministically: the core is told the title is free although it is not.
    doAnswer(
            invocation -> {
              UpdateContext real = (UpdateContext) invocation.callRealMethod();
              return new UpdateContext(real.scene(), real.current(), false);
            })
        .when(facts)
        .forUpdate(any(), any(), any(), any());

    var result =
        mvc.patch()
            .uri("/api/scenes/{scene}/annotations/{id}", scene, other)
            .header("If-Match", "\"0\"")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"taken\"}")
            .exchange();

    assertThat(result).hasStatus(409);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("TITLE_ALREADY_USED");
    String title =
        jdbc.sql("SELECT title FROM annotation WHERE id = :id")
            .param("id", other)
            .query(String.class)
            .single();
    assertThat(title).isEqualTo("Other"); // the rolled-back update left nothing behind
  }
}
