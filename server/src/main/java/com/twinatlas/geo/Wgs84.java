package com.twinatlas.geo;

import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;

public final class Wgs84 {

  public static final int SRID = 4326;

  /** Builds geometries in WGS 84. JTS factories are immutable and safe to share. */
  public static final GeometryFactory FACTORY = new GeometryFactory(new PrecisionModel(), SRID);

  private Wgs84() {}

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
