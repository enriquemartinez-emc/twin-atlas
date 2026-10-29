package com.twinatlas.annotation.core;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

/**
 * What an annotation looks like on the scene. The type fixes the geometry, so a mismatch cannot
 * exist.
 */
public sealed interface Shape {

  Geometry geometry();

  /** A pin on the scene. */
  record Marker(Point point) implements Shape {
    @Override
    public Geometry geometry() {
      return point;
    }
  }

  /** A pin with text, for example "this window needs repair". */
  record Note(Point point, String text) implements Shape {
    @Override
    public Geometry geometry() {
      return point;
    }
  }

  /** An area, for example "inspection area". */
  record Outline(Polygon polygon) implements Shape {
    @Override
    public Geometry geometry() {
      return polygon;
    }
  }
}
