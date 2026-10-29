package com.twinatlas.annotation.core;

import static com.twinatlas.platform.core.Decision.accepted;
import static com.twinatlas.platform.core.Decision.rejected;
import static com.twinatlas.platform.core.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.core.Rejection.INVALID_GEOMETRY;
import static com.twinatlas.platform.core.Rejection.SCENE_NOT_FOUND;
import static com.twinatlas.platform.core.Rejection.TITLE_ALREADY_USED;

import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.platform.core.Decision;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;

/** The rules for creating an annotation. The first rule that fails decides the rejection. */
public final class CreateAnnotationRules {

  private CreateAnnotationRules() {}

  public static Decision evaluate(CreateAnnotation command, CreateContext context) {
    if (!(context.scene() instanceof SceneFound(var extent))) {
      return rejected(SCENE_NOT_FOUND);
    }
    Geometry geometry = command.shape().geometry();
    if (!isValidWgs84(geometry)) {
      return rejected(INVALID_GEOMETRY);
    }
    if (!extent.covers(geometry)) {
      return rejected(GEOMETRY_OUTSIDE_SCENE_EXTENT);
    }
    if (context.titleInUse()) {
      return rejected(TITLE_ALREADY_USED);
    }
    return accepted();
  }

  /** Non-empty, topologically valid (no self-intersections) and inside the WGS 84 world. */
  static boolean isValidWgs84(Geometry geometry) {
    if (geometry.isEmpty() || !geometry.isValid()) {
      return false;
    }
    Envelope box = geometry.getEnvelopeInternal();
    return box.getMinX() >= -180
        && box.getMaxX() <= 180
        && box.getMinY() >= -90
        && box.getMaxY() <= 90;
  }
}
