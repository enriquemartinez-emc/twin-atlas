package com.twinatlas.annotation.core;

import static com.twinatlas.platform.core.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.core.Rejection.INVALID_GEOMETRY;
import static com.twinatlas.platform.core.Rejection.SCENE_NOT_FOUND;
import static com.twinatlas.platform.core.Rejection.TITLE_ALREADY_USED;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.platform.core.Decision;
import com.twinatlas.platform.core.Decision.Accepted;
import com.twinatlas.platform.core.Decision.Rejected;
import com.twinatlas.platform.core.Rejection;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.locationtech.jts.geom.Polygon;

class CreateAnnotationRulesTest {

  /** The scene covers lon 2.17..2.18, lat 41.40..41.41. */
  private static final Polygon EXTENT = Geo.rectangle(2.17, 41.40, 2.18, 41.41);

  private static final UUID SCENE = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final CreateContext SCENE_AND_FREE_TITLE =
      new CreateContext(new SceneFound(EXTENT), false);

  private static CreateAnnotation command(Shape shape) {
    return new CreateAnnotation(SCENE, "Cracked window", shape);
  }

  static Stream<Arguments> accepted() {
    return Stream.of(
        Arguments.of("marker inside", new Marker(Geo.point(2.175, 41.405))),
        Arguments.of("note inside", new Note(Geo.point(2.172, 41.401), "repair")),
        Arguments.of("outline inside", new Outline(Geo.rectangle(2.171, 41.401, 2.179, 41.409))),
        Arguments.of("marker on the boundary", new Marker(Geo.point(2.17, 41.40))),
        Arguments.of(
            "outline touching the boundary", new Outline(Geo.rectangle(2.17, 41.40, 2.18, 41.41))));
  }

  @ParameterizedTest(name = "accepts {0}")
  @MethodSource("accepted")
  void acceptsCommandsThatSatisfyEveryRule(String name, Shape shape) {
    Decision decision = CreateAnnotationRules.evaluate(command(shape), SCENE_AND_FREE_TITLE);

    assertThat(decision).isEqualTo(new Accepted());
  }

  static Stream<Arguments> rejected() {
    Shape inside = new Marker(Geo.point(2.175, 41.405));
    return Stream.of(
        Arguments.of(
            "scene does not exist",
            new CreateContext(new NoScene(), false),
            inside,
            SCENE_NOT_FOUND),
        Arguments.of(
            "self-intersecting outline",
            SCENE_AND_FREE_TITLE,
            new Outline(Geo.bowtie(2.171, 41.401, 2.179, 41.409)),
            INVALID_GEOMETRY),
        Arguments.of(
            "empty polygon",
            SCENE_AND_FREE_TITLE,
            new Outline(Geo.FACTORY.createPolygon()),
            INVALID_GEOMETRY),
        Arguments.of(
            "longitude beyond the world",
            SCENE_AND_FREE_TITLE,
            new Marker(Geo.point(200, 41.405)),
            INVALID_GEOMETRY),
        Arguments.of(
            "latitude beyond the world",
            SCENE_AND_FREE_TITLE,
            new Marker(Geo.point(2.175, 95)),
            INVALID_GEOMETRY),
        Arguments.of(
            "marker outside the scene",
            SCENE_AND_FREE_TITLE,
            new Marker(Geo.point(2.19, 41.405)),
            GEOMETRY_OUTSIDE_SCENE_EXTENT),
        Arguments.of(
            "outline partly outside the scene",
            SCENE_AND_FREE_TITLE,
            new Outline(Geo.rectangle(2.175, 41.405, 2.185, 41.415)),
            GEOMETRY_OUTSIDE_SCENE_EXTENT),
        Arguments.of(
            "title already used",
            new CreateContext(new SceneFound(EXTENT), true),
            inside,
            TITLE_ALREADY_USED));
  }

  @ParameterizedTest(name = "rejects: {0}")
  @MethodSource("rejected")
  void rejectsWithAStableCode(String name, CreateContext context, Shape shape, Rejection expected) {
    Decision decision = CreateAnnotationRules.evaluate(command(shape), context);

    assertThat(decision).isEqualTo(new Rejected(expected));
  }

  static Stream<Arguments> precedence() {
    Shape invalidAndOutside = new Marker(Geo.point(200, 41.405));
    Shape outside = new Marker(Geo.point(2.19, 41.405));
    return Stream.of(
        Arguments.of(
            "missing scene beats everything",
            new CreateContext(new NoScene(), true),
            invalidAndOutside,
            SCENE_NOT_FOUND),
        Arguments.of(
            "invalid geometry beats outside-extent and title",
            new CreateContext(new SceneFound(EXTENT), true),
            invalidAndOutside,
            INVALID_GEOMETRY),
        Arguments.of(
            "outside-extent beats title",
            new CreateContext(new SceneFound(EXTENT), true),
            outside,
            GEOMETRY_OUTSIDE_SCENE_EXTENT));
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("precedence")
  void returnsTheFirstRuleThatFails(
      String name, CreateContext context, Shape shape, Rejection expected) {
    Decision decision = CreateAnnotationRules.evaluate(command(shape), context);

    assertThat(decision).isEqualTo(new Rejected(expected));
  }

  @Test
  void rejectionCodesAreStable() {
    // Renaming a code is a breaking API change: it is exposed as the problem's `code`.
    assertThat(Rejection.values())
        .extracting(Enum::name)
        .containsExactlyInAnyOrder(
            "SCENE_NOT_FOUND",
            "INVALID_GEOMETRY",
            "GEOMETRY_OUTSIDE_SCENE_EXTENT",
            "TITLE_ALREADY_USED",
            "ANNOTATION_NOT_FOUND",
            "STALE_VERSION",
            "GEOMETRY_KIND_MISMATCH",
            "TEXT_ONLY_FOR_NOTES",
            "UNSUPPORTED_SOURCE_ELEMENT",
            "OPEN_WAY",
            "UNTAGGED_ELEMENT");
  }
}
