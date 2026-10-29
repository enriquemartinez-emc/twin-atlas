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

  /** Whether a geometry is the right kind for this shape: pins take a point, outlines a polygon. */
  boolean accepts(Geometry geometry);

  /** Only notes carry text. */
  boolean hasText();

  /** The same kind of shape somewhere else. Call it only when {@link #accepts} said yes. */
  Shape movedTo(Geometry geometry);

  /** The same shape with other text. Call it only when {@link #hasText} said yes. */
  Shape withText(String text);

  /** A pin on the scene. */
  record Marker(Point point) implements Shape {
    @Override
    public Geometry geometry() {
      return point;
    }

    @Override
    public boolean accepts(Geometry geometry) {
      return geometry instanceof Point;
    }

    @Override
    public boolean hasText() {
      return false;
    }

    @Override
    public Shape movedTo(Geometry geometry) {
      return new Marker((Point) geometry);
    }

    @Override
    public Shape withText(String text) {
      return this;
    }
  }

  /** A pin with text, for example "this window needs repair". */
  record Note(Point point, String text) implements Shape {
    @Override
    public Geometry geometry() {
      return point;
    }

    @Override
    public boolean accepts(Geometry geometry) {
      return geometry instanceof Point;
    }

    @Override
    public boolean hasText() {
      return true;
    }

    @Override
    public Shape movedTo(Geometry geometry) {
      return new Note((Point) geometry, text);
    }

    @Override
    public Shape withText(String text) {
      return new Note(point, text);
    }
  }

  /** An area, for example "inspection area". */
  record Outline(Polygon polygon) implements Shape {
    @Override
    public Geometry geometry() {
      return polygon;
    }

    @Override
    public boolean accepts(Geometry geometry) {
      return geometry instanceof Polygon;
    }

    @Override
    public boolean hasText() {
      return false;
    }

    @Override
    public Shape movedTo(Geometry geometry) {
      return new Outline((Polygon) geometry);
    }

    @Override
    public Shape withText(String text) {
      return this;
    }
  }
}
