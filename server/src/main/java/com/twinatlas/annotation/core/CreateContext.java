package com.twinatlas.annotation.core;

/**
 * Derived facts the rules need. The shell computes them from SQL: it passes the scene extent and a
 * flag, never collections of annotations.
 */
public record CreateContext(SceneFacts scene, boolean titleInUse) {}
