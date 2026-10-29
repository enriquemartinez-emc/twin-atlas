package com.twinatlas.annotation.core;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.Annotation.Archived;
import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.Annotation.Published;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.locationtech.jts.geom.Geometry;

class AnnotationUpdateTest {

  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
  private static final UUID SCENE = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final Instant AT = Instant.parse("2026-10-28T12:00:00Z");
  private static final Shape MARKER = new Marker(Geo.point(2.175, 41.405));

  static Stream<Annotation> everyLifecycleState() {
    return Stream.of(
        new Draft(ID, SCENE, "Old", MARKER, AT),
        new Published(ID, SCENE, "Old", MARKER, AT),
        new Archived(ID, SCENE, "Old", MARKER, AT));
  }

  @ParameterizedTest
  @MethodSource("everyLifecycleState")
  void renameKeepsTheLifecycleStateAndEverythingElse(Annotation annotation) {
    Annotation renamed = annotation.rename("New");

    assertThat(renamed).isInstanceOf(annotation.getClass());
    assertThat(renamed.title()).isEqualTo("New");
    assertThat(renamed.id()).isEqualTo(ID);
    assertThat(renamed.sceneId()).isEqualTo(SCENE);
    assertThat(renamed.shape()).isEqualTo(MARKER);
    assertThat(renamed.createdAt()).isEqualTo(AT);
  }

  @ParameterizedTest
  @MethodSource("everyLifecycleState")
  void moveToKeepsTheLifecycleStateAndTheKindOfShape(Annotation annotation) {
    var target = Geo.point(2.172, 41.402);

    Annotation moved = annotation.moveTo(target);

    assertThat(moved).isInstanceOf(annotation.getClass());
    assertThat(moved.shape()).isEqualTo(new Marker(target));
    assertThat(moved.title()).isEqualTo("Old");
  }

  @Test
  void aNoteKeepsItsTextWhenMovedAndItsPositionWhenRetexted() {
    Annotation note = new Draft(ID, SCENE, "Leak", new Note(Geo.point(2.175, 41.405), "wet"), AT);

    Annotation moved = note.moveTo(Geo.point(2.172, 41.402));
    Annotation retexted = note.retext("dry");

    assertThat(moved.shape()).isEqualTo(new Note(Geo.point(2.172, 41.402), "wet"));
    assertThat(retexted.shape()).isEqualTo(new Note(Geo.point(2.175, 41.405), "dry"));
  }

  @Test
  void anOutlineCanMoveToAnotherPolygon() {
    Annotation outline =
        new Draft(ID, SCENE, "Area", new Outline(Geo.rectangle(2.171, 41.401, 2.172, 41.402)), AT);
    var target = Geo.rectangle(2.175, 41.405, 2.178, 41.408);

    assertThat(outline.moveTo(target).shape()).isEqualTo(new Outline(target));
  }

  @Test
  void textMeansNothingToAShapeWithoutText() {
    // The rules refuse this before it gets here. The transform is still total: it changes nothing.
    assertThat(MARKER.withText("ignored")).isSameAs(MARKER);
  }

  @Test
  void updateAppliesOnlyTheFieldsTheCommandReplaces() {
    Annotation note = new Draft(ID, SCENE, "Leak", new Note(Geo.point(2.175, 41.405), "wet"), AT);

    Annotation onlyTitle =
        Annotation.update(
            note,
            new UpdateAnnotation(
                SCENE,
                ID,
                0,
                Change.replace("Drip"),
                Change.<String>keep(),
                Change.<Geometry>keep()));
    Annotation everything =
        Annotation.update(
            note,
            new UpdateAnnotation(
                SCENE,
                ID,
                0,
                Change.replace("Drip"),
                Change.replace("dry"),
                Change.replace(Geo.point(2.176, 41.406))));

    assertThat(onlyTitle).isEqualTo(new Draft(ID, SCENE, "Drip", note.shape(), AT));
    assertThat(everything)
        .isEqualTo(new Draft(ID, SCENE, "Drip", new Note(Geo.point(2.176, 41.406), "dry"), AT));
  }

  @Test
  void aCommandThatKeepsEverythingChangesNothing() {
    Annotation draft = new Draft(ID, SCENE, "Old", MARKER, AT);

    Annotation same =
        Annotation.update(
            draft,
            new UpdateAnnotation(
                SCENE,
                ID,
                0,
                Change.<String>keep(),
                Change.<String>keep(),
                Change.<Geometry>keep()));

    assertThat(same).isEqualTo(draft);
  }

  @Test
  void changeKnowsWhetherItReplacesAndTurnsAMissingValueIntoKeep() {
    assertThat(Change.replace("x").replaces()).isTrue();
    assertThat(Change.keep().replaces()).isFalse();
    assertThat(Change.ofNullable(null).replaces()).isFalse();
    assertThat(Change.ofNullable("x")).isEqualTo(Change.replace("x"));
  }
}
