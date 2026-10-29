package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.CreateAnnotationRules;
import com.twinatlas.annotation.core.CreateContext;
import com.twinatlas.annotation.core.SceneFacts.NoScene;
import com.twinatlas.importing.core.ImportPlan.Accepted;
import com.twinatlas.importing.core.ImportPlan.ItemRejection;
import com.twinatlas.importing.core.OsmTransform.Conversion;
import com.twinatlas.platform.kernel.Decision.Rejected;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Evaluates a whole batch. This is the one place that collects every violation instead of stopping
 * at the first: each element gets its own answer. The rules are not repeated here. Every
 * convertible element goes through {@link CreateAnnotationRules}, the same function that guards
 * creating one annotation by hand.
 */
public final class ImportRules {

  private ImportRules() {}

  public sealed interface Outcome {
    record SceneMissing() implements Outcome {}

    record Planned(ImportPlan plan) implements Outcome {}
  }

  public static Outcome evaluate(UUID sceneId, List<OsmElement> elements, ImportContext context) {
    if (context.scene() instanceof NoScene) {
      return new Outcome.SceneMissing();
    }
    List<Accepted> accepted = new ArrayList<>();
    List<ItemRejection> rejected = new ArrayList<>();
    Set<String> usedInBatch = new HashSet<>();

    for (OsmElement element : elements) {
      switch (OsmTransform.convert(sceneId, element)) {
        case Conversion.Unconvertible(var reference, var reason) ->
            rejected.add(new ItemRejection(reference, reason));
        case Conversion.Converted(var reference, var command) -> {
          String key = command.title().toLowerCase(Locale.ROOT);
          boolean titleInUse = context.takenTitles().contains(key) || usedInBatch.contains(key);
          var decision =
              CreateAnnotationRules.evaluate(
                  command, new CreateContext(context.scene(), titleInUse));
          if (decision instanceof Rejected(var reason)) {
            rejected.add(new ItemRejection(reference, reason));
          } else {
            usedInBatch.add(key);
            accepted.add(new Accepted(reference, command));
          }
        }
      }
    }
    return new Outcome.Planned(new ImportPlan(List.copyOf(accepted), List.copyOf(rejected)));
  }
}
