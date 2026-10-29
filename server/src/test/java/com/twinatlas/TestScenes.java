package com.twinatlas;

import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Creates scenes through the public API, the same way a client would. */
public final class TestScenes {

  /** Lon 2.17..2.18, lat 41.40..41.41 (around the Sagrada Família). */
  public static final double WEST = 2.17;

  public static final double SOUTH = 41.40;
  public static final double EAST = 2.18;
  public static final double NORTH = 41.41;

  private TestScenes() {}

  public static UUID createScene(MockMvcTester mvc) {
    return createScene(mvc, "Scene " + UUID.randomUUID(), WEST, SOUTH, EAST, NORTH);
  }

  public static UUID createScene(
      MockMvcTester mvc, String name, double west, double south, double east, double north) {
    String body =
        """
        {"name":"%s","extent":{"type":"Polygon","coordinates":[[[%s,%s],[%s,%s],[%s,%s],[%s,%s],[%s,%s]]]}}
        """
            .formatted(name, west, south, east, south, east, north, west, north, west, south);
    byte[] response =
        mvc.post()
            .uri("/api/scenes")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .exchange()
            .getResponse()
            .getContentAsByteArray();
    return UUID.fromString(JsonPath.read(new String(response, StandardCharsets.UTF_8), "$.id"));
  }
}
