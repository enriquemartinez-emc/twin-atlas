package com.twinatlas.scene;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Polygon;

public record SceneResponse(
    UUID id,
    String name,
    @Schema(type = "object", description = "GeoJSON Polygon (RFC 7946), WGS 84") Polygon extent,
    Instant createdAt) {}
