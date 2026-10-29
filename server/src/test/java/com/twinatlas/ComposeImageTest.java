package com.twinatlas;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ComposeImageTest {

  @Test
  void composeAndTestcontainersUseTheSamePostgisImage() throws Exception {
    // Surefire runs with server/ as the working directory.
    String compose = Files.readString(Path.of("..", "docker-compose.yml"));

    assertThat(compose).contains("image: " + PostgisImage.NAME);
  }
}
