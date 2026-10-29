package com.twinatlas.annotation;

import jakarta.validation.constraints.NotNull;

public record NearestAnnotation(@NotNull AnnotationSummary annotation, double distanceMeters) {}
