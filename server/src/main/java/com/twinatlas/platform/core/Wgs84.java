package com.twinatlas.platform.core;

import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;

/** The one definition of a usable WGS 84 geometry, shared by the cores and request validation. */
public final class Wgs84 {

  private Wgs84() {}

  /** Non-empty, topologically valid (no self-intersections) and inside the WGS 84 world. */
  public static boolean isValid(Geometry geometry) {
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
