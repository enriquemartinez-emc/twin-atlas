package com.twinatlas.annotation.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import com.twinatlas.annotation.persistence.AnnotationQueries.Filter;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AnnotationQueryPlanTest {

  static final int ROWS = 20_000;

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;

  UUID scene;

  @BeforeAll
  static void nothing() {}

  private UUID seededScene() {
    if (scene == null) {
      scene = TestScenes.createScene(mvc);
      jdbc.sql(
              "INSERT INTO annotation (id, scene_id, kind, title, geom, status, version, created_at)"
                  + " SELECT gen_random_uuid(), :scene, 'MARKER', 'p' || g,"
                  + " ST_SetSRID(ST_MakePoint(2.17 + random() * 0.01, 41.40 + random() * 0.01), 4326),"
                  + " 'DRAFT', 0, TIMESTAMPTZ '2026-01-01 00:00:00+00' + (g || ' seconds')::interval"
                  + " FROM generate_series(1, :rows) g")
          .param("scene", scene)
          .param("rows", ROWS)
          .update();
      jdbc.sql("ANALYZE annotation").update();
    }
    return scene;
  }

  private String plan(String sql, java.util.function.UnaryOperator<JdbcClient.StatementSpec> bind) {
    return bind.apply(jdbc.sql("EXPLAIN (FORMAT JSON) " + sql)).query(String.class).single();
  }

  @Test
  void bboxUsesTheGistIndex() {
    UUID id = seededScene();

    String plan =
        plan(
            AnnotationQueries.listSql(Filter.BBOX, false),
            s ->
                s.param("sceneId", id)
                    .param("west", 2.1700)
                    .param("south", 41.4000)
                    .param("east", 2.1710)
                    .param("north", 41.4010)
                    .param("limit", 51));

    assertThat(plan).contains("ix_annotation_geom").doesNotContain("Seq Scan");
  }

  @Test
  void nearestUsesTheGistIndexForKnn() {
    UUID id = seededScene();

    String plan =
        plan(
            AnnotationQueries.nearestSql(false),
            s ->
                s.param("sceneId", id)
                    .param("longitude", 2.175)
                    .param("latitude", 41.405)
                    .param("limit", 10));

    assertThat(plan)
        .contains("ix_annotation_geom")
        .contains("Index Scan")
        .doesNotContain("Seq Scan");
  }

  @Test
  void nearestWithARadiusStillUsesTheGistIndex() {
    UUID id = seededScene();

    String plan =
        plan(
            AnnotationQueries.nearestSql(true),
            s ->
                s.param("sceneId", id)
                    .param("longitude", 2.175)
                    .param("latitude", 41.405)
                    .param("maxDistance", 50.0)
                    .param("dLat", 50.0 / 110_000)
                    .param("dLon", 50.0 / (110_000 * Math.cos(Math.toRadians(41.405))))
                    .param("limit", 10));

    assertThat(plan).contains("ix_annotation_geom").doesNotContain("Seq Scan");
  }

  @Test
  void theKeysetListUsesTheSceneAndCreatedIndex() {
    UUID id = seededScene();

    String plan =
        plan(
            AnnotationQueries.listSql(Filter.NONE, true),
            s ->
                s.param("sceneId", id)
                    .param("cursorAt", java.time.OffsetDateTime.parse("2026-01-01T01:00:00Z"))
                    .param("cursorId", UUID.randomUUID())
                    .param("limit", 51));

    assertThat(plan).contains("ix_annotation_scene_created").doesNotContain("Seq Scan");
  }
}
