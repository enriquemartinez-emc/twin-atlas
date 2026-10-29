package com.twinatlas.importing;

import com.twinatlas.annotation.core.SceneFacts;
import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.importing.core.ImportContext;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKBReader;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Step 1 of the shell flow for a batch: the scene, and which of the batch's titles are taken. */
@Component
class ImportFacts {

  private final JdbcClient jdbc;
  private final GeometryFactory geometryFactory;

  ImportFacts(JdbcClient jdbc, GeometryFactory geometryFactory) {
    this.jdbc = jdbc;
    this.geometryFactory = geometryFactory;
  }

  ImportContext forImport(UUID sceneId, List<String> titles) {
    SceneFacts scene = sceneFacts(sceneId);
    Set<String> taken =
        scene instanceof SceneFound && !titles.isEmpty() ? takenTitles(sceneId, titles) : Set.of();
    return new ImportContext(scene, taken);
  }

  private SceneFacts sceneFacts(UUID sceneId) {
    return jdbc.sql("SELECT ST_AsBinary(extent) FROM scene WHERE id = :id")
        .param("id", sceneId)
        .query((rs, rowNum) -> rs.getBytes(1))
        .optional()
        .<SceneFacts>map(wkb -> new SceneFound(toPolygon(wkb)))
        .orElseGet(NoScene::new);
  }

  /** One query for the whole batch, bounded by the batch size, not by the scene size. */
  private Set<String> takenTitles(UUID sceneId, List<String> titles) {
    List<String> keys = titles.stream().map(t -> t.toLowerCase(Locale.ROOT)).distinct().toList();
    return new HashSet<>(
        jdbc.sql(
                "SELECT lower(title) FROM annotation WHERE scene_id = :sceneId"
                    + " AND lower(title) IN (:keys)")
            .param("sceneId", sceneId)
            .param("keys", keys)
            .query(String.class)
            .list());
  }

  private Polygon toPolygon(byte[] wkb) {
    try {
      return (Polygon) new WKBReader(geometryFactory).read(wkb);
    } catch (ParseException e) {
      throw new IllegalStateException("Stored scene extent is not valid WKB", e);
    }
  }
}
