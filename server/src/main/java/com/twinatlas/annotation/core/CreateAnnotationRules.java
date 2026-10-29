package com.twinatlas.annotation.core;

import static com.twinatlas.platform.kernel.Decision.accepted;
import static com.twinatlas.platform.kernel.Decision.rejected;
import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.kernel.Rejection.INVALID_GEOMETRY;
import static com.twinatlas.platform.kernel.Rejection.SCENE_NOT_FOUND;
import static com.twinatlas.platform.kernel.Rejection.TITLE_ALREADY_USED;

import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.geo.Wgs84;
import com.twinatlas.platform.kernel.Decision;
import org.locationtech.jts.geom.Geometry;

/** The rules for creating an annotation. The first rule that fails decides the rejection. */
public final class CreateAnnotationRules {

  private CreateAnnotationRules() {}

  public static Decision evaluate(CreateAnnotation command, CreateContext context) {
    if (!(context.scene() instanceof SceneFound(var extent))) {
      return rejected(SCENE_NOT_FOUND);
    }
    Geometry geometry = command.shape().geometry();
    if (!Wgs84.isValid(geometry)) {
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
}
