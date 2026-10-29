package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

public record AnnotationResponse(
    UUID id,
    UUID sceneId,
    AnnotationKind kind,
    String title,
    String body,
    @Schema(ref = "#/components/schemas/GeoJsonGeometry") Geometry geometry,
    String status,
    Instant createdAt) {}
