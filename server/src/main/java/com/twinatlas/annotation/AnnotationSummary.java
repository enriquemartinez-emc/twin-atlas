package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.JsonNode;

public record AnnotationSummary(
    @NotNull UUID id,
    @NotNull UUID sceneId,
    @NotNull AnnotationKind kind,
    @NotNull String title,
    @Schema(nullable = true, description = "Only notes carry text") String body,
    @NotNull AnnotationStatus status,
    @NotNull Instant createdAt,
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonGeometry") JsonNode geometry) {}
