package com.twinatlas.importing.core;

import static com.twinatlas.importing.core.OsmElements.SCENE;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.importing.core.ImportRules.Outcome.Planned;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

class ImportProperties {

  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  @Provide
  Arbitrary<List<OsmElement>> batches() {
    // Wider than the scene on purpose: most points fall outside, some are beyond the world.
    Arbitrary<Double> lon = Arbitraries.doubles().between(-200, 200).ofScale(4);
    Arbitrary<Double> lat = Arbitraries.doubles().between(-100, 100).ofScale(4);
    Arbitrary<Long> id = Arbitraries.longs().between(1, 30);
    Arbitrary<Map<String, String>> tags =
        Arbitraries.of(
            Map.<String, String>of(), Map.of("name", "A"), Map.of("name", "B", "note", "n"));

    Arbitrary<OsmElement> sceneNodes =
        Combinators.combine(
                id,
                Arbitraries.doubles().between(2.16, 2.19).ofScale(4),
                Arbitraries.doubles().between(41.39, 41.42).ofScale(4),
                tags)
            .as((i, x, y, t) -> OsmElements.node(i, x, y, t));
    Arbitrary<OsmElement> anyNodes =
        Combinators.combine(id, lon, lat, tags).as((i, x, y, t) -> OsmElements.node(i, x, y, t));
    Arbitrary<OsmElement> squares =
        Combinators.combine(
                id,
                Arbitraries.doubles().between(2.165, 2.178).ofScale(4),
                Arbitraries.doubles().between(41.395, 41.408).ofScale(4),
                Arbitraries.doubles().between(0.0005, 0.01).ofScale(4),
                tags)
            .as((i, x, y, s, t) -> OsmElements.square(i + 100, t, x, y, s));
    Arbitrary<OsmElement> relations = id.map(i -> new OsmElement.Unsupported("relation", i));
    return Arbitraries.oneOf(sceneNodes, anyNodes, squares, relations).list().ofMaxSize(40);
  }

  @Property
  void everyElementIsAcceptedOrRejectedExactlyOnce(
      @ForAll("batches") List<OsmElement> batch, @ForAll boolean someTitlesTaken) {
    Set<String> taken = someTitlesTaken ? Set.of("a (node/1)", "b (node/2)") : Set.of();

    var outcome = ImportRules.evaluate(ID, batch, new ImportContext(SCENE, taken));

    var plan = ((Planned) outcome).plan();
    assertThat(plan.accepted().size() + plan.rejected().size()).isEqualTo(batch.size());
  }

  @Property
  void everyAcceptedAnnotationLiesInsideTheSceneWithADistinctTitle(
      @ForAll("batches") List<OsmElement> batch) {
    var plan =
        ((Planned) ImportRules.evaluate(ID, batch, new ImportContext(SCENE, Set.of()))).plan();

    Set<String> titles = new HashSet<>();
    for (var accepted : plan.accepted()) {
      assertThat(SCENE.extent().covers(accepted.command().shape().geometry())).isTrue();
      assertThat(titles.add(accepted.command().title().toLowerCase())).isTrue();
    }
  }
}
