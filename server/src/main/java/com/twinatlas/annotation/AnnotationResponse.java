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
    @Schema(
            type = "object",
            description = "GeoJSON geometry (RFC 7946), WGS 84",
            example = "{\"type\":\"Point\",\"coordinates\":[2.1744,41.4036]}")
        Geometry geometry,
    String status,
    Instant createdAt) {}
