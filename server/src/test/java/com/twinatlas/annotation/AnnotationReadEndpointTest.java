package com.twinatlas.annotation;

import static com.twinatlas.annotation.AnnotationApi.marker;
import static com.twinatlas.annotation.AnnotationApi.outline;
import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AnnotationReadEndpointTest {

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @Autowired MeterRegistry meters;

  // ---- helpers ----

  private MvcTestResult get(String uri, Object... vars) {
    return mvc.get().uri(uri, vars).exchange();
  }

  private static String body(MvcTestResult result) {
    return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
  }

  private static List<String> titles(MvcTestResult result) {
    return JsonPath.read(body(result), "$.items[*].title");
  }

  private static List<String> nearestTitles(MvcTestResult result) {
    return JsonPath.read(body(result), "$[*].annotation.title");
  }

  // ---- bbox: "everything visible in the current view" ----

  @Test
  void bboxReturnsOnlyAnnotationsThatIntersectTheView() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "A", 2.172, 41.402);
    marker(mvc, scene, "B", 2.178, 41.408);
    marker(mvc, scene, "C", 2.1745, 41.4045);
    outline(mvc, scene, "Whole site", 2.171, 41.401, 2.179, 41.401, 2.179, 41.409, 2.171, 41.409);

    var result = get("/api/scenes/{id}/annotations?bbox=2.171,41.401,2.175,41.403", scene);

    assertThat(result).hasStatusOk();
    assertThat(titles(result)).containsExactlyInAnyOrder("A", "Whole site");
  }

  @Test
  void bboxUsesTheExactShapeNotJustItsBoundingBox() {
    UUID scene = TestScenes.createScene(mvc);
    // An L: its bounding box covers the whole site, but the notch (east of 2.173, north of 41.403)
    // is empty.
    outline(
        mvc, scene, "L shape", 2.171, 41.401, 2.179, 41.401, 2.179, 41.403, 2.173, 41.403, 2.173,
        41.409, 2.171, 41.409);

    var inTheNotch = get("/api/scenes/{id}/annotations?bbox=2.175,41.405,2.178,41.408", scene);
    var onTheArm = get("/api/scenes/{id}/annotations?bbox=2.1715,41.405,2.1725,41.406", scene);

    assertThat(titles(inTheNotch)).isEmpty();
    assertThat(titles(onTheArm)).containsExactly("L shape");
  }

  @Test
  void aViewWithNothingInItReturnsAnEmptyLastPage() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "A", 2.172, 41.402);

    var result = get("/api/scenes/{id}/annotations?bbox=10,10,11,11", scene);

    assertThat(result).hasStatusOk();
    assertThat(titles(result)).isEmpty();
    assertThat(result).bodyJson().extractingPath("$.nextCursor").isNull();
  }

  @Test
  void aViewAcrossTheAntimeridianFindsBothSides() {
    UUID scene = TestScenes.createScene(mvc, "World " + UUID.randomUUID(), -180, -90, 180, 90);
    marker(mvc, scene, "East side", 179.5, 0);
    marker(mvc, scene, "West side", -179.5, 0);
    marker(mvc, scene, "Greenwich", 0, 0);

    var across = get("/api/scenes/{id}/annotations?bbox=179,-10,-179,10", scene);
    var eastOnly = get("/api/scenes/{id}/annotations?bbox=179,-10,180,10", scene);

    assertThat(titles(across)).containsExactlyInAnyOrder("East side", "West side");
    assertThat(titles(eastOnly)).containsExactly("East side");
  }

  // ---- keyset pagination ----

  @Test
  void keysetPagesWalkEveryAnnotationOnceInCreationOrder() {
    UUID scene = TestScenes.createScene(mvc);
    List<String> expected = new ArrayList<>();
    for (int i = 1; i <= 7; i++) {
      expected.add("m" + i);
      marker(mvc, scene, "m" + i, 2.171 + i * 0.001, 41.405);
    }

    List<String> seen = new ArrayList<>();
    List<Integer> pageSizes = new ArrayList<>();
    String cursor = null;
    do {
      var page =
          cursor == null
              ? get("/api/scenes/{id}/annotations?limit=3", scene)
              : get("/api/scenes/{id}/annotations?limit=3&cursor={c}", scene, cursor);
      assertThat(page).hasStatusOk();
      seen.addAll(titles(page));
      pageSizes.add(titles(page).size());
      cursor = JsonPath.read(body(page), "$.nextCursor");
    } while (cursor != null);

    assertThat(seen).containsExactlyElementsOf(expected);
    assertThat(pageSizes).containsExactly(3, 3, 1);
  }

  @Test
  void keysetPaginationHoldsWhenRowsShareTheSameTimestamp() {
    UUID scene = TestScenes.createScene(mvc);
    for (int i = 1; i <= 5; i++) {
      jdbc.sql(
              "INSERT INTO annotation (id, scene_id, kind, title, geom, status, version, created_at)"
                  + " VALUES (:id, :scene, 'MARKER', :title, ST_SetSRID(ST_MakePoint(2.175, 41.405), 4326),"
                  + " 'DRAFT', 0, TIMESTAMPTZ '2026-01-01 00:00:00+00')")
          .param("id", new UUID(0, i))
          .param("scene", scene)
          .param("title", "same-" + i)
          .update();
    }

    List<String> seen = new ArrayList<>();
    String cursor = null;
    do {
      var page =
          cursor == null
              ? get("/api/scenes/{id}/annotations?limit=2", scene)
              : get("/api/scenes/{id}/annotations?limit=2&cursor={c}", scene, cursor);
      seen.addAll(titles(page));
      cursor = JsonPath.read(body(page), "$.nextCursor");
    } while (cursor != null);

    // ties are broken by id, so nothing is skipped or repeated
    assertThat(seen).containsExactly("same-1", "same-2", "same-3", "same-4", "same-5");
  }

  @Test
  void bboxAndCursorWorkTogether() {
    UUID scene = TestScenes.createScene(mvc);
    for (int i = 1; i <= 4; i++) {
      marker(mvc, scene, "in" + i, 2.172 + i * 0.0001, 41.402);
    }
    marker(mvc, scene, "out", 2.179, 41.409);

    var first = get("/api/scenes/{id}/annotations?bbox=2.171,41.401,2.175,41.403&limit=3", scene);
    String cursor = JsonPath.read(body(first), "$.nextCursor");
    var second =
        get(
            "/api/scenes/{id}/annotations?bbox=2.171,41.401,2.175,41.403&limit=3&cursor={c}",
            scene,
            cursor);

    assertThat(titles(first)).containsExactly("in1", "in2", "in3");
    assertThat(titles(second)).containsExactly("in4");
    assertThat(body(second)).contains("\"nextCursor\":null");
  }

  // ---- nearest-N ----

  @Test
  void nearestReturnsTheClosestFirstWithDistancesInMetres() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "here", 2.1750, 41.4050);
    marker(mvc, scene, "83m east", 2.1760, 41.4050);
    marker(mvc, scene, "330m east", 2.1790, 41.4050);

    var result =
        get("/api/scenes/{id}/annotations/nearest?longitude=2.175&latitude=41.405&limit=2", scene);

    assertThat(result).hasStatusOk();
    assertThat(nearestTitles(result)).containsExactly("here", "83m east");
    double nearest = ((Number) JsonPath.read(body(result), "$[0].distanceMeters")).doubleValue();
    double second = ((Number) JsonPath.read(body(result), "$[1].distanceMeters")).doubleValue();
    assertThat(nearest).isLessThan(1.0);
    assertThat(second).isBetween(80.0, 87.0);
  }

  @Test
  void nearestHonoursTheRadiusAndTreatsInsideAPolygonAsDistanceZero() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "here", 2.1750, 41.4050);
    marker(mvc, scene, "83m east", 2.1760, 41.4050);
    marker(mvc, scene, "330m east", 2.1790, 41.4050);
    outline(mvc, scene, "Zone around", 2.174, 41.404, 2.176, 41.404, 2.176, 41.406, 2.174, 41.406);

    var within100 =
        get(
            "/api/scenes/{id}/annotations/nearest?longitude=2.175&latitude=41.405&maxDistanceMeters=100",
            scene);
    var within10 =
        get(
            "/api/scenes/{id}/annotations/nearest?longitude=2.175&latitude=41.405&maxDistanceMeters=10",
            scene);

    assertThat(nearestTitles(within100))
        .containsExactlyInAnyOrder("here", "83m east", "Zone around");
    assertThat(nearestTitles(within10)).containsExactlyInAnyOrder("here", "Zone around");
    assertThat(body(within10)).contains("\"distanceMeters\":0.0");
  }

  // ---- search: "everything inside a zone" ----

  @Test
  void searchReturnsWhatIntersectsTheZoneAndPaginates() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "in1", 2.172, 41.402);
    marker(mvc, scene, "in2", 2.173, 41.402);
    marker(mvc, scene, "out", 2.178, 41.408);
    outline(
        mvc, scene, "Crosses zone", 2.1725, 41.401, 2.1745, 41.401, 2.1745, 41.409, 2.1725, 41.409);
    String zone = "[[2.171,41.401],[2.175,41.401],[2.175,41.403],[2.171,41.403],[2.171,41.401]]";

    var first = search(scene, zone, 2, null);
    String cursor = JsonPath.read(body(first), "$.nextCursor");
    var second = search(scene, zone, 2, cursor);

    List<String> all = new ArrayList<>(titles(first));
    all.addAll(titles(second));
    assertThat(titles(first)).hasSize(2);
    assertThat(all).containsExactlyInAnyOrder("in1", "in2", "Crosses zone");
    assertThat(body(second)).contains("\"nextCursor\":null");
  }

  private MvcTestResult search(UUID scene, String ring, Integer limit, String cursor) {
    String json =
        "{\"zone\":{\"type\":\"Polygon\",\"coordinates\":[%s]}%s%s}"
            .formatted(
                ring,
                limit == null ? "" : ",\"limit\":" + limit,
                cursor == null ? "" : ",\"cursor\":\"" + cursor + "\"");
    return mvc.post()
        .uri("/api/scenes/{id}/annotations/search", scene)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json)
        .exchange();
  }

  // ---- invalid input and unknown scenes ----

  @ParameterizedTest
  @ValueSource(strings = {"1,2,3", "a,b,c,d", "200,0,10,10", "0,50,10,40", "0,0,10,95", ""})
  void badBboxIsAValidationProblem(String bbox) {
    UUID scene = TestScenes.createScene(mvc);

    var result = get("/api/scenes/{id}/annotations?bbox={b}", scene, bbox);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "201", "-1"})
  void pageSizeOutOfRangeIsAValidationProblemNamingTheParameter(String limit) {
    UUID scene = TestScenes.createScene(mvc);

    var result = get("/api/scenes/{id}/annotations?limit={l}", scene, limit);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("limit");
  }

  @Test
  void aGarbageCursorIsRejected() {
    UUID scene = TestScenes.createScene(mvc);

    var result = get("/api/scenes/{id}/annotations?cursor=not-a-cursor", scene);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("INVALID_CURSOR");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "longitude=2&latitude=95",
        "longitude=181&latitude=0",
        "longitude=2&latitude=41&limit=0",
        "longitude=2&latitude=41&limit=101",
        "longitude=2&latitude=41&maxDistanceMeters=-5"
      })
  void nearestRejectsOutOfRangeParameters(String query) {
    UUID scene = TestScenes.createScene(mvc);

    var result = get("/api/scenes/{id}/annotations/nearest?" + query, scene);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
  }

  @Test
  void searchRejectsASelfIntersectingZone() {
    UUID scene = TestScenes.createScene(mvc);

    var result = search(scene, "[[0,0],[1,1],[1,0],[0,1],[0,0]]", null, null);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
  }

  @Test
  void everyReadAnswers404ForAnUnknownScene() {
    UUID unknown = UUID.randomUUID();
    String ring = "[[0,0],[1,0],[1,1],[0,1],[0,0]]";

    var list = get("/api/scenes/{id}/annotations", unknown);
    var nearest = get("/api/scenes/{id}/annotations/nearest?longitude=0&latitude=0", unknown);
    var search = search(unknown, ring, null, null);

    for (MvcTestResult result : List.of(list, nearest, search)) {
      assertThat(result).hasStatus(404);
      assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("SCENE_NOT_FOUND");
    }
  }

  // ---- observability ----

  @Test
  void everyQueryTypeIsTimed() {
    UUID scene = TestScenes.createScene(mvc);
    marker(mvc, scene, "A", 2.172, 41.402);
    get("/api/scenes/{id}/annotations", scene);
    get("/api/scenes/{id}/annotations?bbox=2.171,41.401,2.175,41.403", scene);
    get("/api/scenes/{id}/annotations/nearest?longitude=2.172&latitude=41.402", scene);
    search(
        scene,
        "[[2.171,41.401],[2.175,41.401],[2.175,41.403],[2.171,41.403],[2.171,41.401]]",
        null,
        null);

    for (String type : List.of("list", "bbox", "nearest", "intersects")) {
      var timer = meters.find(AnnotationQueries.TIMER).tag("type", type).timer();
      assertThat(timer).as("timer for " + type).isNotNull();
      assertThat(timer.count()).isGreaterThanOrEqualTo(1);
    }
    assertThat(get("/actuator/metrics/" + AnnotationQueries.TIMER)).hasStatusOk();
  }
}
