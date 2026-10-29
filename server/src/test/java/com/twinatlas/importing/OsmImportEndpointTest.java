package com.twinatlas.importing;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.twinatlas.TestScenes;
import com.twinatlas.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * The import against real PostGIS, with a small Overpass answer that mixes good and bad elements.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OsmImportEndpointTest {

  @Autowired MockMvcTester mvc;
  @Autowired JdbcClient jdbc;

  private static String fixture() throws IOException {
    return new ClassPathResource("osm/overpass-sagrada-familia.json")
        .getContentAsString(StandardCharsets.UTF_8);
  }

  private String importOsm(UUID scene, String body, int expectedStatus) {
    var response =
        mvc.post()
            .uri("/api/scenes/{id}/imports/osm", scene)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body)
            .exchange()
            .getResponse();
    assertThat(response.getStatus()).isEqualTo(expectedStatus);
    try {
      return response.getContentAsString(StandardCharsets.UTF_8);
    } catch (IOException e) {
      throw new AssertionError(e);
    }
  }

  private Map<String, String> rejectionsByReference(String json) {
    List<String> references = JsonPath.read(json, "$.rejected[*].reference");
    List<String> codes = JsonPath.read(json, "$.rejected[*].code");
    var map = new java.util.LinkedHashMap<String, String>();
    for (int i = 0; i < references.size(); i++) map.put(references.get(i), codes.get(i));
    return map;
  }

  /** In the order the elements appear in the fixture. */
  private static final Map<String, String> EXPECTED_REJECTIONS = expectedRejections();

  private static Map<String, String> expectedRejections() {
    var map = new java.util.LinkedHashMap<String, String>();
    map.put("node/1004", "UNTAGGED_ELEMENT");
    map.put("node/1005", "GEOMETRY_OUTSIDE_SCENE_EXTENT");
    map.put("way/2002", "OPEN_WAY");
    map.put("way/2003", "INVALID_GEOMETRY");
    map.put("relation/3001", "UNSUPPORTED_SOURCE_ELEMENT");
    return map;
  }

  private int rowCount(UUID scene) {
    return jdbc.sql("SELECT count(*) FROM annotation WHERE scene_id = :s")
        .param("s", scene)
        .query(Integer.class)
        .single();
  }

  @Test
  void importsWhatItCanAndReportsEveryProblemAtOnce() throws Exception {
    UUID scene = TestScenes.createScene(mvc);

    String json = importOsm(scene, fixture(), 200);

    assertThat((Integer) JsonPath.read(json, "$.received")).isEqualTo(9);
    assertThat((Integer) JsonPath.read(json, "$.imported")).isEqualTo(4);
    assertThat(rejectionsByReference(json)).containsExactlyEntriesOf(EXPECTED_REJECTIONS);
    assertThat(rowCount(scene)).isEqualTo(4);
  }

  @Test
  void storesNodesAsMarkersOrNotesAndClosedWaysAsOutlinesInDraft() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    importOsm(scene, fixture(), 200);

    var rows =
        jdbc.sql(
                "SELECT title, kind, body, status, GeometryType(geom) AS geometry_type"
                    + " FROM annotation WHERE scene_id = :s ORDER BY title")
            .param("s", scene)
            .query()
            .listOfRows();

    assertThat(rows)
        .extracting(r -> r.get("title"), r -> r.get("kind"), r -> r.get("body"))
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("Bar Pep (node/1001)", "MARKER", null),
            org.assertj.core.groups.Tuple.tuple("Font (node/1002)", "NOTE", "Dry in summer"),
            org.assertj.core.groups.Tuple.tuple("OSM node/1003", "MARKER", null),
            org.assertj.core.groups.Tuple.tuple("Parish hall (way/2001)", "OUTLINE", null));
    assertThat(rows).extracting(r -> r.get("status")).containsOnly("DRAFT");
    assertThat(rows)
        .extracting(r -> r.get("geometry_type"))
        .containsExactly("POINT", "POINT", "POINT", "POLYGON");
  }

  @Test
  void importedAnnotationsBehaveLikeAnyOtherAnnotation() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    importOsm(scene, fixture(), 200);
    UUID id =
        jdbc.sql("SELECT id FROM annotation WHERE scene_id = :s AND title = 'Bar Pep (node/1001)'")
            .param("s", scene)
            .query(UUID.class)
            .single();

    var read = mvc.get().uri("/api/scenes/{s}/annotations/{id}", scene, id).exchange();
    assertThat(read.getResponse().getStatus()).isEqualTo(200);
    assertThat(read.getResponse().getHeader("ETag")).isEqualTo("\"0\"");

    var renamed =
        mvc.patch()
            .uri("/api/scenes/{s}/annotations/{id}", scene, id)
            .header("If-Match", "\"0\"")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"title\":\"Bar Pep, corner\"}")
            .exchange();
    assertThat(renamed.getResponse().getStatus()).isEqualTo(200);
    assertThat(renamed.getResponse().getHeader("ETag")).isEqualTo("\"1\"");
  }

  @Test
  void importingTheSameExtractAgainCreatesNothingAndSaysWhy() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    importOsm(scene, fixture(), 200);

    String again = importOsm(scene, fixture(), 200);

    assertThat((Integer) JsonPath.read(again, "$.imported")).isZero();
    var rejected = rejectionsByReference(again);
    assertThat(rejected).containsAllEntriesOf(EXPECTED_REJECTIONS);
    assertThat(rejected)
        .containsEntry("node/1001", "TITLE_ALREADY_USED")
        .containsEntry("node/1002", "TITLE_ALREADY_USED")
        .containsEntry("node/1003", "TITLE_ALREADY_USED")
        .containsEntry("way/2001", "TITLE_ALREADY_USED");
    assertThat(rowCount(scene)).isEqualTo(4);
  }

  @Test
  void aTitleTakenByAHandMadeAnnotationIsReportedNotOverwritten() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    mvc.post()
        .uri("/api/scenes/{id}/annotations", scene)
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            "{\"kind\":\"MARKER\",\"title\":\"bar pep (NODE/1001)\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[2.172,41.402]}}")
        .exchange();

    String json = importOsm(scene, fixture(), 200);

    assertThat((Integer) JsonPath.read(json, "$.imported")).isEqualTo(3);
    assertThat(rejectionsByReference(json)).containsEntry("node/1001", "TITLE_ALREADY_USED");
  }

  @Test
  void aMissingSceneIsAProblemForTheWholeRequest() throws Exception {
    String json = importOsm(UUID.randomUUID(), fixture(), 404);

    assertThat((String) JsonPath.read(json, "$.code")).isEqualTo("SCENE_NOT_FOUND");
  }

  @Test
  void rejectsAnEmptyBatchAndAnOversizedOne() throws Exception {
    UUID scene = TestScenes.createScene(mvc);

    importOsm(scene, "{\"elements\":[]}", 400);
    importOsm(scene, "{}", 400);
    StringBuilder tooMany = new StringBuilder("{\"elements\":[");
    for (int i = 0; i <= OsmImportRequest.MAX_ELEMENTS; i++) {
      if (i > 0) tooMany.append(',');
      tooMany
          .append("{\"type\":\"node\",\"id\":")
          .append(i)
          .append(",\"lat\":41.405,\"lon\":2.175}");
    }
    String json = importOsm(scene, tooMany.append("]}").toString(), 400);

    assertThat((String) JsonPath.read(json, "$.code")).isEqualTo("VALIDATION_FAILED");
    assertThat(rowCount(scene)).isZero();
  }

  @Test
  void concurrentImportsOfTheSameExtractCreateEachAnnotationExactlyOnce() throws Exception {
    UUID scene = TestScenes.createScene(mvc);
    String body = fixture();
    int clients = 6;
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(clients);
    try {
      List<Future<String>> futures = new ArrayList<>();
      for (int i = 0; i < clients; i++) {
        futures.add(
            pool.submit(
                () -> {
                  start.await();
                  return importOsm(scene, body, 200);
                }));
      }
      start.countDown();
      int imported = 0;
      for (Future<String> future : futures) {
        String json = future.get();
        imported += (Integer) JsonPath.read(json, "$.imported");
        int rejected = ((List<?>) JsonPath.read(json, "$.rejected")).size();
        assertThat((Integer) JsonPath.read(json, "$.imported") + rejected).isEqualTo(9);
      }

      assertThat(imported).isEqualTo(4);
      assertThat(rowCount(scene)).isEqualTo(4);
    } finally {
      pool.shutdownNow();
    }
  }
}
