package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.SceneFacts;
import java.util.Set;

/**
 * Facts for a whole batch: the scene, and which of the batch's titles are already used there
 * (lower-cased). The set is bounded by the size of the batch, never by the size of the scene.
 */
public record ImportContext(SceneFacts scene, Set<String> takenTitles) {}
