package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

public record AnnotationResponse(
    @NotNull UUID id,
    @NotNull UUID sceneId,
    @NotNull AnnotationKind kind,
    @NotNull String title,
    @Schema(nullable = true, description = "Only notes carry text") String body,
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonGeometry") Geometry geometry,
    @NotNull String status,
    @NotNull Instant createdAt) {}
