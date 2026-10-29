package com.twinatlas.scene;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Polygon;

public record SceneResponse(
    UUID id,
    String name,
    @Schema(ref = "#/components/schemas/GeoJsonPolygon") Polygon extent,
    Instant createdAt) {}
