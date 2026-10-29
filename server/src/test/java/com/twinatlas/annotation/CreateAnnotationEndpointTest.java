package com.twinatlas.annotation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import com.twinatlas.annotation.core.CreateContext;
import com.twinatlas.annotation.persistence.AnnotationFacts;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class CreateAnnotationEndpointTest {

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;
  @MockitoSpyBean AnnotationFacts facts;

  static final String INSIDE_POINT = "{\"type\":\"Point\",\"coordinates\":[2.175,41.405]}";
  static final String INSIDE_POLYGON =
      "{\"type\":\"Polygon\",\"coordinates\":[[[2.171,41.401],[2.179,41.401],[2.179,41.409],[2.171,41.409],[2.171,41.401]]]}";

  MvcTestResult post(UUID sceneId, String kind, String title, String body, String geometry) {
    String json =
        """
        {"kind":"%s","title":"%s",%s"geometry":%s}
        """
            .formatted(kind, title, body == null ? "" : "\"body\":\"" + body + "\",", geometry);
    return mvc.post()
        .uri("/api/scenes/{id}/annotations", sceneId)
        .contentType(MediaType.APPLICATION_JSON)
        .content(json)
        .exchange();
  }

  @Test
  void createsAMarkerAsADraftWithLocationAndETag() {
    UUID scene = TestScenes.createScene(mvc);

    var result = post(scene, "MARKER", "Cracked window", null, INSIDE_POINT);

    assertThat(result).hasStatus(201);
    assertThat(result).hasHeader("ETag", "\"0\"");
    assertThat(result).headers().containsHeader("Location");
    assertThat(result).bodyJson().extractingPath("$.status").isEqualTo("DRAFT");
    assertThat(result).bodyJson().extractingPath("$.kind").isEqualTo("MARKER");
    assertThat(result).bodyJson().extractingPath("$.sceneId").isEqualTo(scene.toString());
    assertThat(result).bodyJson().extractingPath("$.geometry.type").isEqualTo("Point");
    assertThat(result).bodyJson().extractingPath("$.body").isNull();
  }

  @Test
  void createsANoteWithTextAndAnOutline() {
    UUID scene = TestScenes.createScene(mvc);

    var note = post(scene, "NOTE", "Leak", "Water stain on the ceiling", INSIDE_POINT);
    var outline = post(scene, "OUTLINE", "Inspection area", null, INSIDE_POLYGON);

    assertThat(note).hasStatus(201);
    assertThat(note).bodyJson().extractingPath("$.body").isEqualTo("Water stain on the ceiling");
    assertThat(outline).hasStatus(201);
    assertThat(outline).bodyJson().extractingPath("$.geometry.type").isEqualTo("Polygon");
  }

  @Test
  void persistsTheGeometryInWgs84() {
    UUID scene = TestScenes.createScene(mvc);
    post(scene, "MARKER", "Srid check", null, INSIDE_POINT);

    Integer srid =
        jdbc.sql("SELECT ST_SRID(geom) FROM annotation WHERE scene_id = :s")
            .param("s", scene)
            .query(Integer.class)
            .single();

    assertThat(srid).isEqualTo(4326);
  }

  @Test
  void rejectsAnUnknownSceneWith404() {
    var result = post(UUID.randomUUID(), "MARKER", "Orphan", null, INSIDE_POINT);

    assertThat(result).hasStatus(404);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("SCENE_NOT_FOUND");
  }

  @Test
  void rejectsASelfIntersectingOutlineWith422() {
    UUID scene = TestScenes.createScene(mvc);
    String bowtie =
        "{\"type\":\"Polygon\",\"coordinates\":[[[2.171,41.401],[2.179,41.409],[2.179,41.401],[2.171,41.409],[2.171,41.401]]]}";

    var result = post(scene, "OUTLINE", "Bowtie", null, bowtie);

    assertThat(result).hasStatus(422);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("INVALID_GEOMETRY");
  }

  @Test
  void rejectsAGeometryOutsideTheWorldWith422() {
    UUID scene = TestScenes.createScene(mvc);

    var result =
        post(
            scene, "MARKER", "Off planet", null, "{\"type\":\"Point\",\"coordinates\":[200,41.4]}");

    assertThat(result).hasStatus(422);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("INVALID_GEOMETRY");
  }

  @Test
  void rejectsAGeometryOutsideTheSceneWith422() {
    UUID scene = TestScenes.createScene(mvc);

    var result =
        post(
            scene, "MARKER", "Far away", null, "{\"type\":\"Point\",\"coordinates\":[3.0,41.405]}");

    assertThat(result).hasStatus(422);
    assertThat(result)
        .bodyJson()
        .extractingPath("$.code")
        .isEqualTo("GEOMETRY_OUTSIDE_SCENE_EXTENT");
  }

  @Test
  void rejectsADuplicateTitleInTheSameSceneCaseInsensitivelyWith409() {
    UUID scene = TestScenes.createScene(mvc);
    post(scene, "MARKER", "Cracked window", null, INSIDE_POINT);

    var result = post(scene, "MARKER", "  CRACKED WINDOW ", null, INSIDE_POINT);

    assertThat(result).hasStatus(409);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("TITLE_ALREADY_USED");
  }

  @Test
  void theSameTitleIsFineInAnotherScene() {
    UUID first = TestScenes.createScene(mvc);
    UUID second = TestScenes.createScene(mvc);
    post(first, "MARKER", "Shared title", null, INSIDE_POINT);

    var result = post(second, "MARKER", "Shared title", null, INSIDE_POINT);

    assertThat(result).hasStatus(201);
  }

  @Test
  void rejectsAMarkerSentWithAPolygonAs400() {
    UUID scene = TestScenes.createScene(mvc);

    var result = post(scene, "MARKER", "Mismatch", null, INSIDE_POLYGON);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    assertThat(result)
        .bodyJson()
        .extractingPath("$.errors[0].field")
        .isEqualTo("geometryMatchingKind");
  }

  @Test
  void rejectsANoteWithoutTextAndAMarkerWithTextAs400() {
    UUID scene = TestScenes.createScene(mvc);

    var note = post(scene, "NOTE", "Empty note", null, INSIDE_POINT);
    var marker = post(scene, "MARKER", "Chatty marker", "text", INSIDE_POINT);

    assertThat(note).hasStatus(400);
    assertThat(marker).hasStatus(400);
    assertThat(note).bodyJson().extractingPath("$.errors[0].field").isEqualTo("bodyMatchingKind");
  }

  @Test
  void rejectsABlankTitleAs400() {
    UUID scene = TestScenes.createScene(mvc);

    var result = post(scene, "MARKER", " ", null, INSIDE_POINT);

    assertThat(result).hasStatus(400);
    assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("title");
  }

  @Test
  void aStaleFactIsStillCaughtByTheUniqueIndexAndMappedToTheSameRejection() {
    UUID scene = TestScenes.createScene(mvc);
    post(scene, "MARKER", "Race loser", null, INSIDE_POINT);
    // Simulate the race: the core is told the title is free although a row now exists.
    doAnswer(
            invocation -> {
              CreateContext real = (CreateContext) invocation.callRealMethod();
              return new CreateContext(real.scene(), false);
            })
        .when(facts)
        .forCreate(any(), any());

    var result = post(scene, "MARKER", "race loser", null, INSIDE_POINT);

    assertThat(result).hasStatus(409);
    assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("TITLE_ALREADY_USED");
    Integer rows =
        jdbc.sql("SELECT count(*) FROM annotation WHERE scene_id = :s")
            .param("s", scene)
            .query(Integer.class)
            .single();
    assertThat(rows).isEqualTo(1);
  }

  @Test
  void theDatabaseRefusesAMarkerWithAPolygonEvenIfTheShellIsBypassed() {
    UUID scene = TestScenes.createScene(mvc);

    org.assertj.core.api.Assertions.assertThatThrownBy(
            () ->
                jdbc.sql(
                        "INSERT INTO annotation (id, scene_id, kind, title, geom, status, version, created_at)"
                            + " VALUES (:id, :scene, 'MARKER', 'bad', ST_GeomFromText('POLYGON((0 0,1 0,1 1,0 0))', 4326),"
                            + " 'DRAFT', 0, now())")
                    .param("id", UUID.randomUUID())
                    .param("scene", scene)
                    .update())
        .hasMessageContaining("ck_annotation_kind_geom");
  }
}
