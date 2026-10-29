package com.twinatlas.annotation.core;

import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

/**
 * Rename, retext and/or move an annotation, as the version the caller last saw. A field left as
 * {@link Change#keep()} is not touched. The kind of an annotation never changes.
 */
public record UpdateAnnotation(
    UUID sceneId,
    UUID annotationId,
    long expectedVersion,
    Change<String> title,
    Change<String> text,
    Change<Geometry> geometry) {}
