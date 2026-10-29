package com.twinatlas.importing.core;

import java.util.List;
import java.util.Map;

/**
 * One element of an OpenStreetMap extract, reduced to what the import needs. Types, not flags: a
 * node has a position, a way has its points, anything else is {@link Unsupported}.
 */
public sealed interface OsmElement {

  long id();

  /** For example {@code node/123}: the stable name of the element in OpenStreetMap. */
  String reference();

  record Node(long id, Position position, Map<String, String> tags) implements OsmElement {
    @Override
    public String reference() {
      return "node/" + id;
    }
  }

  record Way(long id, List<Position> points, Map<String, String> tags) implements OsmElement {
    @Override
    public String reference() {
      return "way/" + id;
    }
  }

  /** Relations, and nodes or ways that arrived without their coordinates. */
  record Unsupported(String type, long id) implements OsmElement {
    @Override
    public String reference() {
      return type + "/" + id;
    }
  }
}
