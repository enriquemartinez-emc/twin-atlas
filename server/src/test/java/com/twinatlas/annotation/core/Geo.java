package com.twinatlas.annotation.core;

import com.twinatlas.geo.Wgs84;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

final class Geo {

  private Geo() {}

  static Point point(double lon, double lat) {
    return Wgs84.FACTORY.createPoint(new Coordinate(lon, lat));
  }

  static Polygon rectangle(double west, double south, double east, double north) {
    return Wgs84.FACTORY.createPolygon(
        new Coordinate[] {
          new Coordinate(west, south),
          new Coordinate(east, south),
          new Coordinate(east, north),
          new Coordinate(west, north),
          new Coordinate(west, south)
        });
  }

  static Polygon bowtie(double west, double south, double east, double north) {
    return Wgs84.FACTORY.createPolygon(
        new Coordinate[] {
          new Coordinate(west, south),
          new Coordinate(east, north),
          new Coordinate(east, south),
          new Coordinate(west, north),
          new Coordinate(west, south)
        });
  }
}
