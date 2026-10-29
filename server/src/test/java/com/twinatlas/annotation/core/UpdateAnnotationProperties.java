package com.twinatlas.annotation.core;

import static com.twinatlas.platform.core.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.core.Rejection.STALE_VERSION;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.CurrentAnnotation.Present;
import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.platform.core.Decision;
import com.twinatlas.platform.core.Decision.Accepted;
import com.twinatlas.platform.core.Decision.Rejected;
import java.time.Instant;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Assume;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.LongRange;
import net.jqwik.api.constraints.Scale;
import org.locationtech.jts.geom.Geometry;

/** Properties of the update rules over arbitrary scenes, versions and positions. */
class UpdateAnnotationProperties {

  private static final UUID SCENE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-0000000000aa");

  record Rect(double west, double south, double east, double north) {
    boolean contains(double lon, double lat) {
      return lon >= west && lon <= east && lat >= south && lat <= north;
    }
  }

  @Provide
  Arbitrary<Rect> rects() {
    Arbitrary<Double> west = Arbitraries.doubles().between(-179, 170).ofScale(6);
    Arbitrary<Double> south = Arbitraries.doubles().between(-89, 80).ofScale(6);
    Arbitrary<Double> width = Arbitraries.doubles().between(0.001, 9).ofScale(6);
    Arbitrary<Double> height = Arbitraries.doubles().between(0.001, 9).ofScale(6);
    return Combinators.combine(west, south, width, height)
        .as((w, s, dw, dh) -> new Rect(w, s, w + dw, s + dh));
  }

  private static UpdateContext context(Rect extent, long version) {
    var shape = new Marker(Geo.point(extent.west(), extent.south()));
    var annotation = new Draft(ID, SCENE_ID, "Title", shape, Instant.EPOCH);
    return new UpdateContext(
        new SceneFound(Geo.rectangle(extent.west(), extent.south(), extent.east(), extent.north())),
        new Present(annotation, version),
        false);
  }

  private static UpdateAnnotation command(long expected, Change<Geometry> geometry) {
    return new UpdateAnnotation(
        SCENE_ID, ID, expected, Change.replace("Other"), Change.keep(), geometry);
  }

  @Property
  void aVersionOtherThanTheStoredOneIsAlwaysStale(
      @ForAll("rects") Rect extent,
      @ForAll @LongRange(min = 0, max = 1_000_000) long stored,
      @ForAll @LongRange(min = 0, max = 1_000_000) long seen) {
    Assume.that(stored != seen);

    Decision decision =
        UpdateAnnotationRules.evaluate(command(seen, Change.keep()), context(extent, stored));

    assertThat(decision).isEqualTo(new Rejected(STALE_VERSION));
  }

  @Property
  void theStoredVersionIsNeverStale(
      @ForAll("rects") Rect extent, @ForAll @LongRange(min = 0, max = 1_000_000) long version) {
    Decision decision =
        UpdateAnnotationRules.evaluate(command(version, Change.keep()), context(extent, version));

    assertThat(decision).isEqualTo(new Accepted());
  }

  @Property
  void movingAMarkerInsideTheSceneIsAccepted(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = 0, max = 1) @Scale(6) double u,
      @ForAll @DoubleRange(min = 0, max = 1) @Scale(6) double v) {
    double lon = extent.west() + u * (extent.east() - extent.west());
    double lat = extent.south() + v * (extent.north() - extent.south());

    Decision decision =
        UpdateAnnotationRules.evaluate(
            command(5, Change.replace(Geo.point(lon, lat))), context(extent, 5));

    assertThat(decision).isEqualTo(new Accepted());
  }

  @Property
  void movingAMarkerOutsideTheSceneIsRejected(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = -180, max = 180) @Scale(6) double lon,
      @ForAll @DoubleRange(min = -90, max = 90) @Scale(6) double lat) {
    Assume.that(!extent.contains(lon, lat));

    Decision decision =
        UpdateAnnotationRules.evaluate(
            command(5, Change.replace(Geo.point(lon, lat))), context(extent, 5));

    assertThat(decision).isEqualTo(new Rejected(GEOMETRY_OUTSIDE_SCENE_EXTENT));
  }

  @Property
  void renamingNeverChangesIdentityOrShape(@ForAll("titles") String title) {
    var shape = new Marker(Geo.point(2.175, 41.405));
    Annotation before = new Draft(ID, SCENE_ID, "Old", shape, Instant.EPOCH);

    Annotation after = before.rename(title);

    assertThat(after.title()).isEqualTo(title);
    assertThat(after.id()).isEqualTo(before.id());
    assertThat(after.shape()).isEqualTo(before.shape());
    assertThat(after.createdAt()).isEqualTo(before.createdAt());
  }

  @Provide
  Arbitrary<String> titles() {
    return Arbitraries.strings()
        .alpha()
        .numeric()
        .withChars(' ', '-')
        .ofMinLength(1)
        .ofMaxLength(120);
  }
}
