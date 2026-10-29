package com.twinatlas.importing.core;

import static com.twinatlas.importing.core.OsmElements.SCENE;
import static com.twinatlas.importing.core.OsmElements.node;
import static com.twinatlas.importing.core.OsmElements.square;
import static com.twinatlas.importing.core.OsmElements.way;
import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.importing.core.ImportPlan.ItemRejection;
import com.twinatlas.importing.core.ImportRules.Outcome;
import com.twinatlas.importing.core.ImportRules.Outcome.Planned;
import com.twinatlas.importing.core.ImportRules.Outcome.SceneMissing;
import com.twinatlas.importing.core.OsmElement.Unsupported;
import com.twinatlas.platform.core.Rejection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ImportRulesTest {

  private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private static final ImportContext FREE = new ImportContext(SCENE, Set.of());

  private static ImportPlan plan(List<OsmElement> elements, ImportContext context) {
    Outcome outcome = ImportRules.evaluate(ID, elements, context);
    assertThat(outcome).isInstanceOf(Planned.class);
    return ((Planned) outcome).plan();
  }

  @Test
  void aMissingSceneRejectsTheWholeBatch() {
    var outcome =
        ImportRules.evaluate(
            ID,
            List.of(node(1, 2.175, 41.405, Map.of("name", "A"))),
            new ImportContext(new NoScene(), Set.of()));

    assertThat(outcome).isEqualTo(new SceneMissing());
  }

  @Test
  void collectsEveryRejectionInsteadOfStoppingAtTheFirst() {
    List<OsmElement> elements =
        List.of(
            node(1, 2.175, 41.405, Map.of("name", "Good")),
            new Unsupported("relation", 2),
            node(3, 2.175, 41.405, Map.of()),
            node(4, 2.5, 41.405, Map.of("name", "Far away")),
            node(5, 200, 41.405, Map.of("name", "Off the world")),
            way(6, Map.of("highway", "path"), 2.171, 41.401, 2.172, 41.402, 2.173, 41.401),
            square(7, Map.of("building", "yes"), 2.171, 41.401, 0.002),
            way(
                8,
                Map.of("building", "yes"),
                2.171,
                41.401,
                2.179,
                41.409,
                2.179,
                41.401,
                2.171,
                41.409,
                2.171,
                41.401));

    var result = plan(elements, FREE);

    assertThat(result.accepted())
        .extracting(ImportPlan.Accepted::reference)
        .containsExactly("node/1", "way/7");
    assertThat(result.rejected())
        .containsExactly(
            new ItemRejection("relation/2", Rejection.UNSUPPORTED_SOURCE_ELEMENT),
            new ItemRejection("node/3", Rejection.UNTAGGED_ELEMENT),
            new ItemRejection("node/4", Rejection.GEOMETRY_OUTSIDE_SCENE_EXTENT),
            new ItemRejection("node/5", Rejection.INVALID_GEOMETRY),
            new ItemRejection("way/6", Rejection.OPEN_WAY),
            new ItemRejection("way/8", Rejection.INVALID_GEOMETRY));
  }

  @Test
  void aTitleAlreadyInTheSceneIsRejectedAsTheAnnotationRulesWould() {
    var element = node(1, 2.175, 41.405, Map.of("name", "Bar"));
    var context = new ImportContext(SCENE, Set.of("bar (node/1)"));

    var result = plan(List.of(element), context);

    assertThat(result.accepted()).isEmpty();
    assertThat(result.rejected())
        .containsExactly(new ItemRejection("node/1", Rejection.TITLE_ALREADY_USED));
  }

  @Test
  void theSameElementTwiceInOneBatchIsImportedOnce() {
    var element = node(1, 2.175, 41.405, Map.of("name", "Bar"));

    var result = plan(List.of(element, element), FREE);

    assertThat(result.accepted()).hasSize(1);
    assertThat(result.rejected())
        .containsExactly(new ItemRejection("node/1", Rejection.TITLE_ALREADY_USED));
  }

  @Test
  void titlesAreComparedWithoutRegardToCase() {
    var first = node(1, 2.175, 41.405, Map.of("name", "bar"));
    var second = node(1, 2.176, 41.406, Map.of("name", "BAR"));

    var result = plan(List.of(first, second), FREE);

    assertThat(result.accepted()).hasSize(1);
    assertThat(result.rejected()).hasSize(1);
  }

  @Test
  void anEmptyBatchPlansNothing() {
    var result = plan(List.of(), FREE);

    assertThat(result.accepted()).isEmpty();
    assertThat(result.rejected()).isEmpty();
  }
}
