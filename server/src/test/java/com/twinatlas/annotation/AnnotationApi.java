package com.twinatlas.annotation;

import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

final class AnnotationApi {

  private AnnotationApi() {}

  static MvcTestResult marker(MockMvcTester mvc, UUID scene, String title, double lon, double lat) {
    return create(
        mvc,
        scene,
        "{\"kind\":\"MARKER\",\"title\":\"%s\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[%s,%s]}}"
            .formatted(title, lon, lat));
  }

  /** Ring as lon,lat pairs; the first point is repeated at the end for you. */
  static MvcTestResult outline(MockMvcTester mvc, UUID scene, String title, double... lonLat) {
    StringBuilder ring = new StringBuilder();
    for (int i = 0; i < lonLat.length; i += 2) {
      ring.append("[%s,%s],".formatted(lonLat[i], lonLat[i + 1]));
    }
    ring.append("[%s,%s]".formatted(lonLat[0], lonLat[1]));
    return create(
        mvc,
        scene,
        "{\"kind\":\"OUTLINE\",\"title\":\"%s\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[%s]]}}"
            .formatted(title, ring));
  }

  private static MvcTestResult create(MockMvcTester mvc, UUID scene, String json) {
    MvcTestResult result =
        mvc.post()
            .uri("/api/scenes/{id}/annotations", scene)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json)
            .exchange();
    if (result.getResponse().getStatus() != 201) {
      throw new AssertionError("fixture was rejected: " + result.getResponse().getStatus());
    }
    return result;
  }
}
