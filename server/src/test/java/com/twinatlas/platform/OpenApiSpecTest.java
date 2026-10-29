package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;

/**
 * The committed {@code docs/openapi.json} is the contract the client SDK is generated from. This
 * test regenerates it from the running app and fails when the committed copy is stale. Rewrite it
 * with {@code ./mvnw test -Dtest=OpenApiSpecTest -Dopenapi.update=true}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiSpecTest {

  // Surefire runs with server/ as the working directory.
  private static final Path COMMITTED = Path.of("..", "docs", "openapi.json");

  @Autowired MockMvcTester mvc;
  @Autowired JsonMapper mapper;

  @Test
  void committedSpecMatchesTheRunningApp() throws Exception {
    byte[] raw = mvc.get().uri("/v3/api-docs").exchange().getResponse().getContentAsByteArray();
    String generated =
        mapper
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(mapper.readTree(new String(raw, StandardCharsets.UTF_8)))
            + "\n";

    if (Boolean.getBoolean("openapi.update")) {
      Files.createDirectories(COMMITTED.getParent());
      Files.writeString(COMMITTED, generated);
    }

    assertThat(COMMITTED)
        .as(
            "docs/openapi.json is missing or stale. Regenerate it with:"
                + " ./mvnw test -Dtest=OpenApiSpecTest -Dopenapi.update=true")
        .exists();
    assertThat(Files.readString(COMMITTED)).isEqualTo(generated);
  }
}
