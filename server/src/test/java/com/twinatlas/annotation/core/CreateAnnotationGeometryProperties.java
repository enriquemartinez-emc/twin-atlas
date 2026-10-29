package com.twinatlas.annotation.core;

import static com.twinatlas.platform.kernel.Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT;
import static com.twinatlas.platform.kernel.Rejection.INVALID_GEOMETRY;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.SceneFacts.SceneFound;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.platform.kernel.Decision;
import com.twinatlas.platform.kernel.Decision.Accepted;
import com.twinatlas.platform.kernel.Decision.Rejected;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.DoubleRange;
import net.jqwik.api.constraints.Scale;
import org.locationtech.jts.geom.Polygon;

class CreateAnnotationGeometryProperties {

  private static final UUID SCENE = UUID.fromString("00000000-0000-0000-0000-000000000001");

  record Rect(double west, double south, double east, double north) {
    Polygon polygon() {
      return Geo.rectangle(west, south, east, north);
    }

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

  private static Decision evaluate(Rect extent, Shape shape, boolean titleInUse) {
    return CreateAnnotationRules.evaluate(
        new CreateAnnotation(SCENE, "title", shape),
        new CreateContext(new SceneFound(extent.polygon()), titleInUse));
  }

  @Property
  void aMarkerInsideTheExtentIsAccepted(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = 0, max = 1) @Scale(6) double u,
      @ForAll @DoubleRange(min = 0, max = 1) @Scale(6) double v) {
    double lon = extent.west() + u * (extent.east() - extent.west());
    double lat = extent.south() + v * (extent.north() - extent.south());

    Decision decision = evaluate(extent, new Marker(Geo.point(lon, lat)), false);

    assertThat(decision).isEqualTo(new Accepted());
  }

  @Property
  void aMarkerInsideTheWorldButOutsideTheExtentIsRejectedAsOutside(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = -180, max = 180) @Scale(6) double lon,
      @ForAll @DoubleRange(min = -90, max = 90) @Scale(6) double lat) {
    net.jqwik.api.Assume.that(!extent.contains(lon, lat));

    Decision decision = evaluate(extent, new Marker(Geo.point(lon, lat)), false);

    assertThat(decision).isEqualTo(new Rejected(GEOMETRY_OUTSIDE_SCENE_EXTENT));
  }

  @Property
  void aMarkerOutsideTheWorldIsRejectedAsInvalidWhateverTheExtent(
      @ForAll("rects") Rect extent, @ForAll("outsideTheWorld") double[] lonLat) {
    Decision decision = evaluate(extent, new Marker(Geo.point(lonLat[0], lonLat[1])), false);

    assertThat(decision).isEqualTo(new Rejected(INVALID_GEOMETRY));
  }

  @Provide
  Arbitrary<double[]> outsideTheWorld() {
    // Built by offset from the limit, so a value can never land exactly on the valid boundary.
    Arbitrary<Double> offset = Arbitraries.doubles().between(0.001, 800).ofScale(3);
    Arbitrary<Double> sign = Arbitraries.of(1.0, -1.0);
    Arbitrary<Double> okLat = Arbitraries.doubles().between(-90, 90).ofScale(6);
    Arbitrary<Double> okLon = Arbitraries.doubles().between(-180, 180).ofScale(6);
    Arbitrary<Double> badLon = Combinators.combine(offset, sign).as((d, sg) -> sg * (180 + d));
    Arbitrary<Double> badLat = Combinators.combine(offset, sign).as((d, sg) -> sg * (90 + d));
    return Arbitraries.oneOf(
        Combinators.combine(badLon, okLat).as((lon, lat) -> new double[] {lon, lat}),
        Combinators.combine(okLon, badLat).as((lon, lat) -> new double[] {lon, lat}));
  }

  @Property
  void anOutlineEqualToTheExtentIsAcceptedBecauseTheBoundaryCounts(@ForAll("rects") Rect extent) {
    Decision decision =
        evaluate(
            extent,
            new Outline(
                Geo.rectangle(extent.west(), extent.south(), extent.east(), extent.north())),
            false);

    assertThat(decision).isEqualTo(new Accepted());
  }

  @Property
  void anOutlineGrownBeyondTheExtentIsRejectedAsOutside(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = 0.0001, max = 0.5) @Scale(6) double growth) {
    // keep the grown rectangle inside the world so only the extent rule can fail
    double west = Math.max(-180, extent.west() - growth);
    double south = Math.max(-90, extent.south() - growth);
    double east = Math.min(180, extent.east() + growth);
    double north = Math.min(90, extent.north() + growth);
    net.jqwik.api.Assume.that(
        west < extent.west()
            || south < extent.south()
            || east > extent.east()
            || north > extent.north());

    Decision decision =
        evaluate(extent, new Outline(Geo.rectangle(west, south, east, north)), false);

    assertThat(decision).isEqualTo(new Rejected(GEOMETRY_OUTSIDE_SCENE_EXTENT));
  }

  @Property
  void evaluateIsTotalForAnyFiniteMarker(
      @ForAll("rects") Rect extent,
      @ForAll @DoubleRange(min = -1000, max = 1000) @Scale(6) double lon,
      @ForAll @DoubleRange(min = -1000, max = 1000) @Scale(6) double lat,
      @ForAll boolean titleInUse) {
    Decision decision = evaluate(extent, new Marker(Geo.point(lon, lat)), titleInUse);

    assertThat(decision).isInstanceOfAny(Accepted.class, Rejected.class);
  }
}
