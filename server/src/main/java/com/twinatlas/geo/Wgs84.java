package com.twinatlas.geo;

import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;

/**
 * WGS 84, the one reference system of storage and API: its identifier, the factory that builds
 * geometries in it, and the one definition of a usable geometry. Pure JTS, so the cores and the
 * shell share it.
 */
public final class Wgs84 {

  /** The EPSG code of WGS 84 (see ADR 0001). */
  public static final int SRID = 4326;

  /** Builds geometries in WGS 84. JTS factories are immutable and safe to share. */
  public static final GeometryFactory FACTORY = new GeometryFactory(new PrecisionModel(), SRID);

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
