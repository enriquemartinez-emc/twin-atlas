package com.twinatlas.platform;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Documents the problem body (RFC 7807) for OpenAPI and the generated SDK. At runtime the body is a
 * Spring {@code ProblemDetail}. {@code OpenApiConfig} fills {@code code} with every stable code.
 */
public record ProblemResponse(
    String type,
    @NotNull String title,
    int status,
    @NotNull String detail,
    String instance,
    @NotNull @Schema(description = "Stable machine-readable error code") String code) {}
