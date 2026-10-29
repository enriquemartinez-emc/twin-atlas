package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.geo.Wgs84;
import com.twinatlas.importing.core.OsmElement.Node;
import com.twinatlas.importing.core.OsmElement.Way;
import java.util.List;
import java.util.Map;
import org.locationtech.jts.geom.Coordinate;

/** Fixtures for importing core tests. Plain Java and JTS: no Spring, no database. */
final class OsmElements {

  /** The scene covers lon 2.17..2.18, lat 41.40..41.41. */
  static final SceneFound SCENE =
      new SceneFound(
          Wgs84.FACTORY.createPolygon(
              new Coordinate[] {
                new Coordinate(2.17, 41.40),
                new Coordinate(2.18, 41.40),
                new Coordinate(2.18, 41.41),
                new Coordinate(2.17, 41.41),
                new Coordinate(2.17, 41.40)
              }));

  private OsmElements() {}

  static Node node(long id, double lon, double lat, Map<String, String> tags) {
    return new Node(id, new Position(lon, lat), tags);
  }

  static Way way(long id, Map<String, String> tags, double... lonLat) {
    return new Way(id, positions(lonLat), tags);
  }

  static List<Position> positions(double... lonLat) {
    return java.util.stream.IntStream.range(0, lonLat.length / 2)
        .mapToObj(i -> new Position(lonLat[2 * i], lonLat[2 * i + 1]))
        .toList();
  }

  /** A closed square ring starting at the south-west corner. */
  static Way square(long id, Map<String, String> tags, double west, double south, double size) {
    return way(
        id,
        tags,
        west,
        south,
        west + size,
        south,
        west + size,
        south + size,
        west,
        south + size,
        west,
        south);
  }
}
