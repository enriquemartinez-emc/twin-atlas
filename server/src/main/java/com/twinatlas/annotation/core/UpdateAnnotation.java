package com.twinatlas.annotation.core;

import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

public record UpdateAnnotation(
    UUID sceneId,
    UUID annotationId,
    long expectedVersion,
    Change<String> title,
    Change<String> text,
    Change<Geometry> geometry) {}
