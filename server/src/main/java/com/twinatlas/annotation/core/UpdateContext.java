package com.twinatlas.annotation.core;

/**
 * Derived facts for an update: the scene's extent, the stored annotation with its version, and
 * whether the new title is already taken by a different annotation in the scene.
 */
public record UpdateContext(
    SceneFacts scene, CurrentAnnotation current, boolean titleUsedByAnother) {}
