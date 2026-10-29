package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.CreateAnnotation;
import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.importing.core.OsmElement.Node;
import com.twinatlas.importing.core.OsmElement.Unsupported;
import com.twinatlas.importing.core.OsmElement.Way;
import com.twinatlas.platform.core.Rejection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;

/**
 * Total transforms from OpenStreetMap elements to the commands the annotation core already
 * understands. Nothing here decides whether an annotation is acceptable: the annotation rules do
 * that. This only says what an element would become, or why it cannot become anything.
 */
public final class OsmTransform {

  /** Same reference system as everything else: WGS 84. */
  private static final GeometryFactory GEOMETRY = new GeometryFactory(new PrecisionModel(), 4326);

  private static final int MAX_TITLE = 120;
  private static final int MAX_TEXT = 2000;

  private OsmTransform() {}

  public sealed interface Conversion {
    String reference();

    record Converted(String reference, CreateAnnotation command) implements Conversion {}

    record Unconvertible(String reference, Rejection reason) implements Conversion {}
  }

  public static Conversion convert(UUID sceneId, OsmElement element) {
    return switch (element) {
      case Unsupported unsupported ->
          new Conversion.Unconvertible(element.reference(), Rejection.UNSUPPORTED_SOURCE_ELEMENT);
      case Node node when node.tags().isEmpty() ->
          new Conversion.Unconvertible(element.reference(), Rejection.UNTAGGED_ELEMENT);
      case Way way when way.tags().isEmpty() ->
          new Conversion.Unconvertible(element.reference(), Rejection.UNTAGGED_ELEMENT);
      case Node node -> converted(sceneId, node, pin(node));
      case Way way ->
          isClosedRing(way.points())
              ? converted(sceneId, way, new Outline(GEOMETRY.createPolygon(ring(way.points()))))
              : new Conversion.Unconvertible(element.reference(), Rejection.OPEN_WAY);
    };
  }

  /**
   * The title an element would get: its name, then its reference, so that two places called "Bar"
   * stay distinct and importing the same extract twice is recognised as a repeat. An element with
   * no name is titled by its reference alone.
   */
  public static String titleFor(OsmElement element) {
    String reference = element.reference();
    String name = tagsOf(element).getOrDefault("name", "").trim();
    if (name.isEmpty()) {
      return "OSM " + reference;
    }
    String suffix = " (" + reference + ")";
    String clipped =
        name.length() > MAX_TITLE - suffix.length()
            ? name.substring(0, MAX_TITLE - suffix.length())
            : name;
    return clipped + suffix;
  }

  private static Conversion converted(UUID sceneId, OsmElement element, Shape shape) {
    return new Conversion.Converted(
        element.reference(), new CreateAnnotation(sceneId, titleFor(element), shape));
  }

  /** A pin, or a note when the place carries a description. */
  private static Shape pin(Node node) {
    var point = GEOMETRY.createPoint(new Coordinate(node.position().lon(), node.position().lat()));
    String text = firstNonBlank(node.tags().get("description"), node.tags().get("note"));
    return text.isEmpty() ? new Marker(point) : new Note(point, clip(text, MAX_TEXT));
  }

  private static boolean isClosedRing(List<Position> points) {
    return points.size() >= 4 && points.getFirst().equals(points.getLast());
  }

  private static Coordinate[] ring(List<Position> points) {
    return points.stream().map(p -> new Coordinate(p.lon(), p.lat())).toArray(Coordinate[]::new);
  }

  private static Map<String, String> tagsOf(OsmElement element) {
    return switch (element) {
      case Node node -> node.tags();
      case Way way -> way.tags();
      case Unsupported unsupported -> Map.of();
    };
  }

  private static String firstNonBlank(String first, String second) {
    if (first != null && !first.isBlank()) return first.trim();
    if (second != null && !second.isBlank()) return second.trim();
    return "";
  }

  private static String clip(String text, int max) {
    return text.length() > max ? text.substring(0, max) : text;
  }
}
