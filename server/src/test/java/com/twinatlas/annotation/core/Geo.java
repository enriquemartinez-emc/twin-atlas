package com.twinatlas.annotation.core;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;

/** Geometry fixtures for core tests. Plain JTS: no Spring, no database. */
final class Geo {

  static final GeometryFactory FACTORY = new GeometryFactory(new PrecisionModel(), 4326);

  private Geo() {}

  static Point point(double lon, double lat) {
    return FACTORY.createPoint(new Coordinate(lon, lat));
  }

  static Polygon rectangle(double west, double south, double east, double north) {
    return FACTORY.createPolygon(
        new Coordinate[] {
          new Coordinate(west, south),
          new Coordinate(east, south),
          new Coordinate(east, north),
          new Coordinate(west, north),
          new Coordinate(west, south)
        });
  }

  /** Two edges cross: not a valid polygon. */
  static Polygon bowtie(double west, double south, double east, double north) {
    return FACTORY.createPolygon(
        new Coordinate[] {
          new Coordinate(west, south),
          new Coordinate(east, north),
          new Coordinate(east, south),
          new Coordinate(west, north),
          new Coordinate(west, south)
        });
  }
}
