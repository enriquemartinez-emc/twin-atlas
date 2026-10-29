package com.twinatlas.annotation;

import com.twinatlas.annotation.core.CreateContext;
import com.twinatlas.annotation.core.CurrentAnnotation;
import com.twinatlas.annotation.core.SceneFacts;
import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.annotation.core.UpdateContext;
import java.util.UUID;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKBReader;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Step 1 of the shell flow: derive the facts the rules need with small SQL queries. */
@Component
class AnnotationFacts {

  private final JdbcClient jdbc;
  private final GeometryFactory geometryFactory;

  AnnotationFacts(JdbcClient jdbc, GeometryFactory geometryFactory) {
    this.jdbc = jdbc;
    this.geometryFactory = geometryFactory;
  }

  CreateContext forCreate(UUID sceneId, String title) {
    SceneFacts scene = sceneFacts(sceneId);
    boolean titleInUse = scene instanceof SceneFound && titleInUse(sceneId, title);
    return new CreateContext(scene, titleInUse);
  }

  /**
   * Facts for an update. The annotation itself was already loaded by the endpoint, so only the
   * scene and the title check need SQL. A title is only checked when the update replaces it.
   */
  UpdateContext forUpdate(
      UUID sceneId, UUID annotationId, CurrentAnnotation current, String replacementTitle) {
    SceneFacts scene = sceneFacts(sceneId);
    boolean usedByAnother =
        scene instanceof SceneFound
            && replacementTitle != null
            && titleUsedByAnother(sceneId, annotationId, replacementTitle);
    return new UpdateContext(scene, current, usedByAnother);
  }

  private boolean titleUsedByAnother(UUID sceneId, UUID annotationId, String title) {
    return jdbc.sql(
            "SELECT EXISTS (SELECT 1 FROM annotation WHERE scene_id = :sceneId"
                + " AND lower(title) = lower(:title) AND id <> :id)")
        .param("sceneId", sceneId)
        .param("title", title)
        .param("id", annotationId)
        .query(Boolean.class)
        .single();
  }

  private SceneFacts sceneFacts(UUID sceneId) {
    return jdbc.sql("SELECT ST_AsBinary(extent) FROM scene WHERE id = :id")
        .param("id", sceneId)
        .query((rs, rowNum) -> rs.getBytes(1))
        .optional()
        .<SceneFacts>map(wkb -> new SceneFound(toPolygon(wkb)))
        .orElseGet(NoScene::new);
  }

  private boolean titleInUse(UUID sceneId, String title) {
    return jdbc.sql(
            "SELECT EXISTS (SELECT 1 FROM annotation WHERE scene_id = :sceneId"
                + " AND lower(title) = lower(:title))")
        .param("sceneId", sceneId)
        .param("title", title)
        .query(Boolean.class)
        .single();
  }

  private Polygon toPolygon(byte[] wkb) {
    try {
      return (Polygon) new WKBReader(geometryFactory).read(wkb);
    } catch (ParseException e) {
      throw new IllegalStateException("Stored scene extent is not valid WKB", e);
    }
  }
}
