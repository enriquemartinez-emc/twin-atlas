package com.twinatlas.annotation;

import static com.twinatlas.annotation.AnnotationApi.marker;
import static com.twinatlas.annotation.AnnotationApi.outline;
import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
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
class UpdateAnnotationEndpointTest {

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;

  record Created(UUID scene, UUID id, String etag) {}

  // ---- helpers ----

  private static String body(MvcTestResult result) {
    return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
  }

  private Created markerIn(UUID scene, String title) {
    return created(scene, marker(mvc, scene, title, 2.175, 41.405));
  }

  private Created created(UUID scene, MvcTestResult result) {
    return new Created(
        scene,
        UUID.fromString(JsonPath.read(body(result), "$.id")),
        result.getResponse().getHeader("ETag"));
  }

  private MvcTestResult patch(UUID scene, UUID id, String ifMatch, String json) {
    var request =
        mvc.patch()
            .uri("/api/scenes/{scene}/annotations/{id}", scene, id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json);
    if (ifMatch != null) request = request.header("If-Match", ifMatch);
    return request.exchange();
  }

  private MvcTestResult patch(Created annotation, String json) {
    return patch(annotation.scene(), annotation.id(), annotation.etag(), json);
  }

  private MvcTestResult get(UUID scene, UUID id) {
    return mvc.get().uri("/api/scenes/{scene}/annotations/{id}", scene, id).exchange();
  }

  private static final String RENAME = "{\"title\":\"New title\"}";

  // ---- GET: one annotation and its ETag ----

  @Test
  void getReturnsTheAnnotationWithItsEtag() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result = get(scene, annotation.id());

    assertThat(result).hasStatusOk();
    assertThat(result).hasHeader("ETag", "\"0\"");
    assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Cracked window");
    assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(annotation.id().toString());
  }

  @Test
  void getAnswers404WithTheRightCode() {
    var scene = TestScenes.createScene(mvc);
    var otherScene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Elsewhere");

    var unknownId = get(scene, UUID.randomUUID());
    var wrongScene = get(otherScene, annotation.id());
    var unknownScene = get(UUID.randomUUID(), annotation.id());

    assertThat(unknownId).hasStatus(404);
    assertThat(unknownId).bodyJson().extractingPath("$.code").isEqualTo("ANNOTATION_NOT_FOUND");
    assertThat(wrongScene).hasStatus(404);
    assertThat(wrongScene).bodyJson().extractingPath("$.code").isEqualTo("ANNOTATION_NOT_FOUND");
    assertThat(unknownScene).hasStatus(404);
    assertThat(unknownScene).bodyJson().extractingPath("$.code").isEqualTo("SCENE_NOT_FOUND");
  }

  // ---- PATCH: the changes that work ----

  @Test
  void renamesAnAnnotationAndHandsOutTheNextEtag() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result = patch(annotation, RENAME);

    assertThat(result).hasStatusOk();
    assertThat(result).hasHeader("ETag", "\"1\"");
    assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("New title");
    assertThat(get(scene, annotation.id()))
        .bodyJson()
        .extractingPath("$.title")
        .isEqualTo("New title");
  }

  @Test
  void anAnnotationMayChangeTheCaseOfItsOwnTitle() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "cracked window");

    var result = patch(annotation, "{\"title\":\"Cracked Window\"}");

    assertThat(result).hasStatusOk();
  }

  @Test
  void movesAMarker() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result =
        patch(annotation, "{\"geometry\":{\"type\":\"Point\",\"coordinates\":[2.172,41.402]}}");

    assertThat(result).hasStatusOk();
    Double lon =
        jdbc.sql("SELECT ST_X(geom) FROM annotation WHERE id = :id")
            .param("id", annotation.id())
            .query(Double.class)
            .single();
    assertThat(lon).isEqualTo(2.172);
  }

  @Test
  void changesTheTextOfANoteAndMovesAnOutline() {
    var scene = TestScenes.createScene(mvc);
    var note =
        created(
            scene,
            mvc.post()
                .uri("/api/scenes/{id}/annotations", scene)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"kind\":\"NOTE\",\"title\":\"Leak\",\"body\":\"wet\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[2.175,41.405]}}")
                .exchange());
    var area =
        created(
            scene,
            outline(
                mvc, scene, "Area", 2.171, 41.401, 2.172, 41.401, 2.172, 41.402, 2.171, 41.402));

    var retext = patch(note, "{\"body\":\"dry now\"}");
    var move =
        patch(
            area,
            "{\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[2.175,41.405],[2.178,41.405],[2.178,41.408],[2.175,41.408],[2.175,41.405]]]}}");

    assertThat(retext).hasStatusOk();
    assertThat(retext).bodyJson().extractingPath("$.body").isEqualTo("dry now");
    assertThat(move).hasStatusOk();
    assertThat(move).bodyJson().extractingPath("$.geometry.type").isEqualTo("Polygon");
  }

  @Test
  void anUpdateMayCarryTheWeakFormOfTheEtag() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result = patch(scene, annotation.id(), "W/" + annotation.etag(), RENAME);

    assertThat(result).hasStatusOk();
  }

  // ---- preconditions: If-Match ----

  @Test
  void aMissingIfMatchIs428() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result = patch(scene, annotation.id(), null, RENAME);

    assertThat(result).hasStatus(428);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("PRECONDITION_REQUIRED");
    assertThat(get(scene, annotation.id()))
        .bodyJson()
        .extractingPath("$.title")
        .isEqualTo("Cracked window");
  }

  @Test
  void aMalformedIfMatchIs400() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var result = patch(scene, annotation.id(), "abc", RENAME);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("REQUEST_INVALID");
  }

  @Test
  void aStaleIfMatchIs412AndNothingIsWritten() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");
    assertThat(patch(annotation, "{\"title\":\"First\"}")).hasStatusOk(); // the version is now 1

    var stale = patch(annotation, "{\"title\":\"Second\"}"); // still sends "0"

    assertThat(stale).hasStatus(412);
    assertThat(stale).bodyJson().extractingPath("$.code").isEqualTo("STALE_VERSION");
    assertThat(get(scene, annotation.id())).bodyJson().extractingPath("$.title").isEqualTo("First");
  }

  // ---- one test per rejection ----

  @Test
  void rejectsAnUnknownAnnotationAndAnUnknownScene() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var noAnnotation = patch(scene, UUID.randomUUID(), "\"0\"", RENAME);
    var noScene = patch(UUID.randomUUID(), annotation.id(), "\"0\"", RENAME);

    assertThat(noAnnotation).hasStatus(404);
    assertThat(noAnnotation).bodyJson().extractingPath("$.code").isEqualTo("ANNOTATION_NOT_FOUND");
    assertThat(noScene).hasStatus(404);
    assertThat(noScene).bodyJson().extractingPath("$.code").isEqualTo("SCENE_NOT_FOUND");
  }

  @Test
  void rejectsATitleAnotherAnnotationUses() {
    var scene = TestScenes.createScene(mvc);
    markerIn(scene, "Taken");
    var other = markerIn(scene, "Other");

    var result = patch(other, "{\"title\":\"  TAKEN \"}");

    assertThat(result).hasStatus(409);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("TITLE_ALREADY_USED");
  }

  @Test
  void rejectsMovingOutsideTheSceneOrOffThePlanet() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var outside =
        patch(annotation, "{\"geometry\":{\"type\":\"Point\",\"coordinates\":[3.0,41.405]}}");
    var offPlanet =
        patch(annotation, "{\"geometry\":{\"type\":\"Point\",\"coordinates\":[200,41.4]}}");

    assertThat(outside).hasStatus(422);
    assertThat(outside)
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo("GEOMETRY_OUTSIDE_SCENE_EXTENT");
    assertThat(offPlanet).hasStatus(422);
    assertThat(offPlanet).bodyJson().extractingPath("$.code").isEqualTo("INVALID_GEOMETRY");
  }

  @Test
  void rejectsASelfCrossingOutline() {
    var scene = TestScenes.createScene(mvc);
    var area =
        created(
            scene,
            outline(
                mvc, scene, "Area", 2.171, 41.401, 2.172, 41.401, 2.172, 41.402, 2.171, 41.402));

    var result =
        patch(
            area,
            "{\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[2.171,41.401],[2.179,41.409],[2.179,41.401],[2.171,41.409],[2.171,41.401]]]}}");

    assertThat(result).hasStatus(422);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("INVALID_GEOMETRY");
  }

  @Test
  void rejectsTheWrongKindOfShapeAndTextOnAMarker() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var polygon =
        patch(
            annotation,
            "{\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[2.171,41.401],[2.172,41.401],[2.172,41.402],[2.171,41.401]]]}}");
    var text = patch(annotation, "{\"body\":\"words\"}");

    assertThat(polygon).hasStatus(422);
    assertThat(polygon).bodyJson().extractingPath("$.code").isEqualTo("GEOMETRY_KIND_MISMATCH");
    assertThat(text).hasStatus(422);
    assertThat(text).bodyJson().extractingPath("$.code").isEqualTo("TEXT_ONLY_FOR_NOTES");
  }

  // ---- request shape ----

  @Test
  void anEmptyUpdateAndABlankOrLongTitleAreValidationProblems() {
    var scene = TestScenes.createScene(mvc);
    var annotation = markerIn(scene, "Cracked window");

    var empty = patch(annotation, "{}");
    var blank = patch(annotation, "{\"title\":\"   \"}");
    var tooLong = patch(annotation, "{\"title\":\"" + "x".repeat(121) + "\"}");

    for (MvcTestResult result : java.util.List.of(empty, blank, tooLong)) {
      assertThat(result).hasStatus(400);
      assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    }
  }
}
