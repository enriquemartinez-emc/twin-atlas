package com.twinatlas.scene;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Polygon;

public record SceneResponse(
    @NotNull UUID id,
    @NotNull String name,
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonPolygon") Polygon extent,
    @NotNull Instant createdAt) {}
