package com.twinatlas.annotation.core;

import static com.twinatlas.platform.kernel.Rejection.ANNOTATION_NOT_FOUND;
import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_KIND_MISMATCH;
import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.kernel.Rejection.INVALID_GEOMETRY;
import static com.twinatlas.platform.kernel.Rejection.SCENE_NOT_FOUND;
import static com.twinatlas.platform.kernel.Rejection.STALE_VERSION;
import static com.twinatlas.platform.kernel.Rejection.TEXT_ONLY_FOR_NOTES;
import static com.twinatlas.platform.kernel.Rejection.TITLE_ALREADY_USED;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.CurrentAnnotation.Missing;
import com.twinatlas.annotation.core.CurrentAnnotation.Present;
import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.platform.kernel.Decision;
import com.twinatlas.platform.kernel.Decision.Accepted;
import com.twinatlas.platform.kernel.Decision.Rejected;
import com.twinatlas.platform.kernel.Rejection;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.locationtech.jts.geom.Geometry;

class UpdateAnnotationRulesTest {

  /** The scene covers lon 2.17..2.18, lat 41.40..41.41. */
  private static final SceneFacts SCENE = new SceneFound(Geo.rectangle(2.17, 41.40, 2.18, 41.41));

  private static final UUID SCENE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
  private static final long VERSION = 3;

  private static final Shape MARKER = new Marker(Geo.point(2.175, 41.405));
  private static final Shape NOTE = new Note(Geo.point(2.175, 41.405), "leak");
  private static final Shape OUTLINE = new Outline(Geo.rectangle(2.171, 41.401, 2.179, 41.409));

  private static CurrentAnnotation stored(Shape shape) {
    return new Present(new Draft(ID, SCENE_ID, "Cracked window", shape, Instant.EPOCH), VERSION);
  }

  private static UpdateContext context(Shape shape) {
    return new UpdateContext(SCENE, stored(shape), false);
  }

  private static UpdateAnnotation change(
      long expected, Change<String> title, Change<String> text, Change<Geometry> geometry) {
    return new UpdateAnnotation(SCENE_ID, ID, expected, title, text, geometry);
  }

  private static UpdateAnnotation rename() {
    return change(VERSION, Change.replace("New title"), Change.keep(), Change.keep());
  }

  private static UpdateAnnotation move(Geometry geometry) {
    return change(VERSION, Change.keep(), Change.keep(), Change.replace(geometry));
  }

  private static UpdateAnnotation retext() {
    return change(VERSION, Change.keep(), Change.replace("new text"), Change.keep());
  }

  static Stream<Arguments> accepted() {
    return Stream.of(
        Arguments.of("rename", rename(), MARKER),
        Arguments.of("move a marker inside", move(Geo.point(2.172, 41.402)), MARKER),
        Arguments.of("move a marker onto the boundary", move(Geo.point(2.17, 41.40)), MARKER),
        Arguments.of("move a note inside", move(Geo.point(2.178, 41.408)), NOTE),
        Arguments.of("change the text of a note", retext(), NOTE),
        Arguments.of(
            "move an outline inside", move(Geo.rectangle(2.172, 41.402, 2.178, 41.408)), OUTLINE),
        Arguments.of(
            "rename, retext and move together",
            change(
                VERSION,
                Change.replace("Other"),
                Change.replace("other text"),
                Change.replace(Geo.point(2.173, 41.403))),
            NOTE));
  }

  @ParameterizedTest(name = "accepts: {0}")
  @MethodSource("accepted")
  void acceptsChangesThatSatisfyEveryRule(String name, UpdateAnnotation command, Shape shape) {
    assertThat(UpdateAnnotationRules.evaluate(command, context(shape))).isEqualTo(new Accepted());
  }

  static Stream<Arguments> rejected() {
    UpdateContext markerContext = context(MARKER);
    return Stream.of(
        Arguments.of(
            "scene does not exist",
            rename(),
            new UpdateContext(new NoScene(), stored(MARKER), false),
            SCENE_NOT_FOUND),
        Arguments.of(
            "annotation does not exist",
            rename(),
            new UpdateContext(SCENE, new Missing(), false),
            ANNOTATION_NOT_FOUND),
        Arguments.of(
            "the caller saw an older version",
            change(VERSION - 1, Change.replace("New title"), Change.keep(), Change.keep()),
            markerContext,
            STALE_VERSION),
        Arguments.of(
            "the caller saw a newer version",
            change(VERSION + 1, Change.replace("New title"), Change.keep(), Change.keep()),
            markerContext,
            STALE_VERSION),
        Arguments.of("text for a marker", retext(), markerContext, TEXT_ONLY_FOR_NOTES),
        Arguments.of("text for an outline", retext(), context(OUTLINE), TEXT_ONLY_FOR_NOTES),
        Arguments.of(
            "a polygon for a marker",
            move(Geo.rectangle(2.171, 41.401, 2.172, 41.402)),
            markerContext,
            GEOMETRY_KIND_MISMATCH),
        Arguments.of(
            "a point for an outline",
            move(Geo.point(2.175, 41.405)),
            context(OUTLINE),
            GEOMETRY_KIND_MISMATCH),
        Arguments.of(
            "a self-crossing outline",
            move(Geo.bowtie(2.171, 41.401, 2.179, 41.409)),
            context(OUTLINE),
            INVALID_GEOMETRY),
        Arguments.of(
            "a point beyond the world",
            move(Geo.point(200, 41.405)),
            markerContext,
            INVALID_GEOMETRY),
        Arguments.of(
            "a point outside the scene",
            move(Geo.point(2.19, 41.405)),
            markerContext,
            GEOMETRY_OUTSIDE_SCENE_EXTENT),
        Arguments.of(
            "an outline partly outside the scene",
            move(Geo.rectangle(2.175, 41.405, 2.185, 41.415)),
            context(OUTLINE),
            GEOMETRY_OUTSIDE_SCENE_EXTENT),
        Arguments.of(
            "a title used by another annotation",
            rename(),
            new UpdateContext(SCENE, stored(MARKER), true),
            TITLE_ALREADY_USED));
  }

  @ParameterizedTest(name = "rejects: {0}")
  @MethodSource("rejected")
  void rejectsWithAStableCode(
      String name, UpdateAnnotation command, UpdateContext context, Rejection expected) {
    assertThat(UpdateAnnotationRules.evaluate(command, context)).isEqualTo(new Rejected(expected));
  }

  static Stream<Arguments> precedence() {
    UpdateAnnotation everythingWrong =
        change(
            VERSION - 1,
            Change.replace("Taken"),
            Change.replace("text"),
            Change.replace(Geo.point(200, 41)));
    return Stream.of(
        Arguments.of(
            "missing scene beats everything",
            everythingWrong,
            new UpdateContext(new NoScene(), new Missing(), true),
            SCENE_NOT_FOUND),
        Arguments.of(
            "missing annotation beats a stale version",
            everythingWrong,
            new UpdateContext(SCENE, new Missing(), true),
            ANNOTATION_NOT_FOUND),
        Arguments.of(
            "a stale version beats the field rules",
            everythingWrong,
            new UpdateContext(SCENE, stored(MARKER), true),
            STALE_VERSION),
        Arguments.of(
            "text for a marker beats the geometry rules",
            change(
                VERSION,
                Change.replace("Taken"),
                Change.replace("text"),
                Change.replace(Geo.point(200, 41))),
            new UpdateContext(SCENE, stored(MARKER), true),
            TEXT_ONLY_FOR_NOTES),
        Arguments.of(
            "a wrong kind beats an invalid shape",
            change(
                VERSION,
                Change.replace("Taken"),
                Change.keep(),
                Change.replace(Geo.bowtie(2.171, 41.401, 2.179, 41.409))),
            new UpdateContext(SCENE, stored(MARKER), true),
            GEOMETRY_KIND_MISMATCH),
        Arguments.of(
            "an invalid shape beats outside the scene and the title",
            change(
                VERSION,
                Change.replace("Taken"),
                Change.keep(),
                Change.replace(Geo.point(200, 41))),
            new UpdateContext(SCENE, stored(MARKER), true),
            INVALID_GEOMETRY),
        Arguments.of(
            "outside the scene beats the title",
            change(
                VERSION,
                Change.replace("Taken"),
                Change.keep(),
                Change.replace(Geo.point(2.19, 41.405))),
            new UpdateContext(SCENE, stored(MARKER), true),
            GEOMETRY_OUTSIDE_SCENE_EXTENT));
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("precedence")
  void returnsTheFirstRuleThatFails(
      String name, UpdateAnnotation command, UpdateContext context, Rejection expected) {
    assertThat(UpdateAnnotationRules.evaluate(command, context)).isEqualTo(new Rejected(expected));
  }

  @Test
  void fieldsLeftAloneAreNotChecked() {
    // A taken title and a stale-looking shape do not matter when the update does not touch them.
    UpdateContext titleTaken = new UpdateContext(SCENE, stored(MARKER), true);
    UpdateAnnotation onlyMoves = move(Geo.point(2.172, 41.402));

    Decision decision = UpdateAnnotationRules.evaluate(onlyMoves, titleTaken);

    assertThat(decision).isEqualTo(new Accepted());
  }
}
