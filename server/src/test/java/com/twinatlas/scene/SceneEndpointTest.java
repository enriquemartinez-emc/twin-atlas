package com.twinatlas.scene;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class SceneEndpointTest {

  @Autowired MockMvcTester mvc;

  @Test
  void createsAndFetchesAScene() {
    UUID id = TestScenes.createScene(mvc);

    var result = mvc.get().uri("/api/scenes/{id}", id).exchange();

    assertThat(result).hasStatusOk();
    assertThat(result).hasHeader("ETag", "\"0\"");
    assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(id.toString());
    assertThat(result).bodyJson().extractingPath("$.extent.type").isEqualTo("Polygon");
  }

  @Test
  void createReturnsLocationAndETag() {
    var result =
        mvc.post()
            .uri("/api/scenes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"name":"Plaza","extent":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}
                """)
            .exchange();

    assertThat(result).hasStatus(201);
    assertThat(result).headers().containsHeader("Location");
    assertThat(result).hasHeader("ETag", "\"0\"");
  }

  @Test
  void unknownSceneIsNotFound() {
    var result = mvc.get().uri("/api/scenes/{id}", UUID.randomUUID()).exchange();

    assertThat(result).hasStatus(404);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("SCENE_NOT_FOUND");
  }

  @Test
  void selfIntersectingExtentIsAValidationProblem() {
    var result =
        mvc.post()
            .uri("/api/scenes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"name":"Bowtie","extent":{"type":"Polygon","coordinates":[[[0,0],[1,1],[1,0],[0,1],[0,0]]]}}
                """)
            .exchange();

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
  }

  @Test
  void blankNameIsAValidationProblem() {
    var result =
        mvc.post()
            .uri("/api/scenes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"name":" ","extent":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}
                """)
            .exchange();

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
  }

  @Test
  void listsScenesNewestFirst() {
    UUID older = TestScenes.createScene(mvc);
    UUID newer = TestScenes.createScene(mvc);

    var result = mvc.get().uri("/api/scenes").exchange();

    assertThat(result).hasStatusOk();
    assertThat(result)
        .bodyJson()
        .extractingPath("$[*].id")
        .asList()
        .containsSubsequence(newer.toString(), older.toString());
  }
}
