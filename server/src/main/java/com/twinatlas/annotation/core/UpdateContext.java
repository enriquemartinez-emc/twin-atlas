package com.twinatlas.annotation.core;

public record UpdateContext(
    SceneFacts scene, CurrentAnnotation current, boolean titleUsedByAnother) {}
