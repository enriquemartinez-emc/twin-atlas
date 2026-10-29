package com.twinatlas.importing.core;

import static com.twinatlas.importing.core.OsmElements.node;
import static com.twinatlas.importing.core.OsmElements.square;
import static com.twinatlas.importing.core.OsmElements.way;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.importing.core.OsmElement.Unsupported;
import com.twinatlas.importing.core.OsmTransform.Conversion;
import com.twinatlas.importing.core.OsmTransform.Conversion.Converted;
import com.twinatlas.importing.core.OsmTransform.Conversion.Unconvertible;
import com.twinatlas.platform.kernel.Rejection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class OsmTransformTest {

  private static final UUID SCENE = UUID.fromString("00000000-0000-0000-0000-000000000001");

  private static Conversion convert(OsmElement element) {
    return OsmTransform.convert(SCENE, element);
  }

  @Test
  void aTaggedNodeBecomesAMarkerTitledByNameAndReference() {
    var result = convert(node(7, 2.175, 41.405, Map.of("name", "Bar Pep", "amenity", "bar")));

    assertThat(result).isInstanceOf(Converted.class);
    var command = ((Converted) result).command();
    assertThat(command.title()).isEqualTo("Bar Pep (node/7)");
    assertThat(command.sceneId()).isEqualTo(SCENE);
    assertThat(command.shape()).isInstanceOf(Marker.class);
    assertThat(command.shape().geometry().getCoordinate().x).isEqualTo(2.175);
    assertThat(command.shape().geometry().getCoordinate().y).isEqualTo(41.405);
  }

  @Test
  void aNodeWithADescriptionBecomesANote() {
    var result =
        convert(
            node(8, 2.175, 41.405, Map.of("name", "Fountain", "description", " Dry in summer ")));

    var shape = ((Converted) result).command().shape();
    assertThat(shape)
        .isEqualTo(
            new Note(
                shape.geometry() instanceof org.locationtech.jts.geom.Point p ? p : null,
                "Dry in summer"));
  }

  @Test
  void theNoteTagIsUsedWhenThereIsNoDescription() {
    var result = convert(node(9, 2.175, 41.405, Map.of("note", "check access")));

    assertThat(((Converted) result).command().shape()).isInstanceOf(Note.class);
  }

  @Test
  void aClosedWayBecomesAnOutline() {
    var result =
        convert(square(10, Map.of("building", "yes", "name", "Hall"), 2.171, 41.401, 0.002));

    var command = ((Converted) result).command();
    assertThat(command.title()).isEqualTo("Hall (way/10)");
    assertThat(command.shape()).isInstanceOf(Outline.class);
    assertThat(command.shape().geometry().getNumPoints()).isEqualTo(5);
  }

  static Stream<Arguments> titles() {
    return Stream.of(
        Arguments.of("name and reference", node(1, 0, 0, Map.of("name", "Bar")), "Bar (node/1)"),
        Arguments.of("no name", node(2, 0, 0, Map.of("shop", "bakery")), "OSM node/2"),
        Arguments.of("blank name", node(3, 0, 0, Map.of("name", "   ")), "OSM node/3"),
        Arguments.of("name is trimmed", node(4, 0, 0, Map.of("name", "  Bar ")), "Bar (node/4)"),
        Arguments.of(
            "a long name is clipped so the title fits 120 characters",
            node(5, 0, 0, Map.of("name", "x".repeat(300))),
            "x".repeat(120 - " (node/5)".length()) + " (node/5)"));
  }

  @ParameterizedTest(name = "title: {0}")
  @MethodSource("titles")
  void titlesNeverExceedTheLimitAndStayDistinctByReference(
      String name, OsmElement element, String expected) {
    String title = OsmTransform.titleFor(element);

    assertThat(title).isEqualTo(expected);
    assertThat(title.length()).isLessThanOrEqualTo(120);
  }

  static Stream<Arguments> unconvertible() {
    return Stream.of(
        Arguments.of(
            "relation", new Unsupported("relation", 11), Rejection.UNSUPPORTED_SOURCE_ELEMENT),
        Arguments.of(
            "node without tags", node(12, 2.175, 41.405, Map.of()), Rejection.UNTAGGED_ELEMENT),
        Arguments.of(
            "way without tags",
            square(13, Map.of(), 2.171, 41.401, 0.002),
            Rejection.UNTAGGED_ELEMENT),
        Arguments.of(
            "open way",
            way(14, Map.of("highway", "residential"), 2.171, 41.401, 2.172, 41.402, 2.173, 41.401),
            Rejection.OPEN_WAY),
        Arguments.of(
            "closed way with three points",
            way(15, Map.of("building", "yes"), 2.171, 41.401, 2.172, 41.402, 2.171, 41.401),
            Rejection.OPEN_WAY),
        Arguments.of("way without points", way(16, Map.of("building", "yes")), Rejection.OPEN_WAY));
  }

  @ParameterizedTest(name = "cannot convert {0}")
  @MethodSource("unconvertible")
  void explainsWhyAnElementCannotBecomeAnAnnotation(
      String name, OsmElement element, Rejection reason) {
    assertThat(convert(element)).isEqualTo(new Unconvertible(element.reference(), reason));
  }
}
