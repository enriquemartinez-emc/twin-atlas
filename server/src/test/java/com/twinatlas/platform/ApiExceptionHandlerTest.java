package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest
@Import({ApiExceptionHandler.class, ApiExceptionHandlerTest.ProbeController.class})
class ApiExceptionHandlerTest {

  record Body(@NotBlank String name) {}

  @RestController
  static class ProbeController {
    @PostMapping("/probe")
    String create(@Valid @RequestBody Body body) {
      return body.name();
    }

    @GetMapping("/probe/conflict")
    String conflict() {
      throw new OptimisticLockingFailureException("stale");
    }

    @GetMapping("/probe/boom")
    String boom() {
      throw new IllegalStateException("secret internals");
    }
  }

  @Autowired MockMvcTester mvc;

  @Test
  void invalidBodyIsAValidationProblemWithFieldErrors() {
    var result =
        mvc.post()
            .uri("/probe")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\"}")
            .exchange();

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("name");
  }

  @Test
  void malformedJsonIsARequestInvalidProblem() {
    assertThat(
            mvc.post().uri("/probe").contentType(MediaType.APPLICATION_JSON).content("{not json"))
        .hasStatus(400)
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo("REQUEST_INVALID");
  }

  @Test
  void optimisticLockFailureIsAConflictProblem() {
    assertThat(mvc.get().uri("/probe/conflict"))
        .hasStatus(409)
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo("CONCURRENT_MODIFICATION");
  }

  @Test
  void unexpectedFailuresDoNotLeakInternals() {
    var result = mvc.get().uri("/probe/boom");

    assertThat(result)
        .hasStatus(500)
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo("INTERNAL_ERROR");
    assertThat(result).bodyText().doesNotContain("secret internals");
  }
}
