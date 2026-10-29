package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiTest {

  @Autowired MockMvcTester mvc;

  @Test
  void specDocumentsTheEndpointsAndEveryStableErrorCode() {
    var result = mvc.get().uri("/v3/api-docs").exchange();

    assertThat(result).hasStatusOk();
    assertThat(result)
        .bodyJson()
        .extractingPath("$.paths['/api/scenes/{sceneId}/annotations'].post")
        .isNotNull();
    assertThat(result).bodyJson().extractingPath("$.paths['/api/scenes'].post").isNotNull();
    assertThat(result)
        .bodyJson()
        .extractingPath("$.components.schemas.ProblemResponse.properties.code.enum")
        .asList()
        .contains(
            "SCENE_NOT_FOUND",
            "INVALID_GEOMETRY",
            "GEOMETRY_OUTSIDE_SCENE_EXTENT",
            "TITLE_ALREADY_USED",
            "VALIDATION_FAILED",
            "CONCURRENT_MODIFICATION");
  }
}
