package com.twinatlas.annotation.core;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

public sealed interface Shape {

  Geometry geometry();

  boolean accepts(Geometry geometry);

  boolean hasText();

  Shape movedTo(Geometry geometry);

  Shape withText(String text);

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
