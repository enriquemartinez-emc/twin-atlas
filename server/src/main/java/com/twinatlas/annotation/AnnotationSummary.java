package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

/** Read-side projection, built straight from SQL. No domain type is involved. */
public record AnnotationSummary(
    @NotNull UUID id,
    @NotNull UUID sceneId,
    @NotNull AnnotationKind kind,
    @NotNull String title,
    @Schema(nullable = true, description = "Only notes carry text") String body,
    @NotNull String status,
    @NotNull Instant createdAt,
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonGeometry") JsonNode geometry) {}
