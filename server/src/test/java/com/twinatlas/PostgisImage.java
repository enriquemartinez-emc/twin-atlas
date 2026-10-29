package com.twinatlas;

import org.testcontainers.utility.DockerImageName;

/** Same image as docker-compose.yml. {@code ComposeImageTest} fails if the two drift apart. */
public final class PostgisImage {

  public static final String NAME = "postgis/postgis:17-3.6";

  private PostgisImage() {}

  public static DockerImageName imageName() {
    return DockerImageName.parse(NAME).asCompatibleSubstituteFor("postgres");
  }
}
