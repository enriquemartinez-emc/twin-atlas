package com.twinatlas.annotation.core;

import static com.twinatlas.platform.kernel.Decision.accepted;
import static com.twinatlas.platform.kernel.Decision.rejected;
import static com.twinatlas.platform.kernel.Rejection.ANNOTATION_NOT_FOUND;
import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_KIND_MISMATCH;
import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.kernel.Rejection.INVALID_GEOMETRY;
import static com.twinatlas.platform.kernel.Rejection.SCENE_NOT_FOUND;
import static com.twinatlas.platform.kernel.Rejection.STALE_VERSION;
import static com.twinatlas.platform.kernel.Rejection.TEXT_ONLY_FOR_NOTES;
import static com.twinatlas.platform.kernel.Rejection.TITLE_ALREADY_USED;

import com.twinatlas.annotation.core.Change.Replace;
import com.twinatlas.annotation.core.CurrentAnnotation.Present;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.geo.Wgs84;
import com.twinatlas.platform.kernel.Decision;
import org.locationtech.jts.geom.Geometry;

/**
 * The rules for changing an annotation. The first rule that fails decides the rejection. The
 * version check lives here, not in the endpoint: "has someone changed this since you read it?" is a
 * decision about the data, so it is a pure rule with a stable code. The database's version column
 * is still the last guard when two requests race.
 */
public final class UpdateAnnotationRules {

  private UpdateAnnotationRules() {}

  public static Decision evaluate(UpdateAnnotation command, UpdateContext context) {
    if (!(context.scene() instanceof SceneFound(var extent))) {
      return rejected(SCENE_NOT_FOUND);
    }
    if (!(context.current() instanceof Present(var current, var version))) {
      return rejected(ANNOTATION_NOT_FOUND);
    }
    if (version != command.expectedVersion()) {
      return rejected(STALE_VERSION);
    }
    if (command.text().replaces() && !current.shape().hasText()) {
      return rejected(TEXT_ONLY_FOR_NOTES);
    }
    if (command.geometry() instanceof Replace<Geometry>(var geometry)) {
      if (!current.shape().accepts(geometry)) {
        return rejected(GEOMETRY_KIND_MISMATCH);
      }
      if (!Wgs84.isValid(geometry)) {
        return rejected(INVALID_GEOMETRY);
      }
      if (!extent.covers(geometry)) {
        return rejected(GEOMETRY_OUTSIDE_SCENE_EXTENT);
      }
    }
    if (command.title().replaces() && context.titleUsedByAnother()) {
      return rejected(TITLE_ALREADY_USED);
    }
    return accepted();
  }
}
