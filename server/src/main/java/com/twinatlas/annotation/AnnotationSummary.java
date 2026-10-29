package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/** Read-side projection, built straight from SQL. No domain type is involved. */
public record AnnotationSummary(
    UUID id,
    UUID sceneId,
    AnnotationKind kind,
    String title,
    String body,
    String status,
    Instant createdAt,
    @Schema(ref = "#/components/schemas/GeoJsonGeometry") JsonNode geometry) {}
