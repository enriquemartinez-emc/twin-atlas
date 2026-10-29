package com.twinatlas.annotation.web;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.twinatlas.annotation.AnnotationKind;
import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

/** Request shape only. Whether the geometry is valid or fits the scene is a domain rule. */
public record CreateAnnotationRequest(
    @NotNull AnnotationKind kind,
    @NotBlank @Size(max = 120) String title,
    @Size(max = 2000) @Schema(description = "Required for NOTE, not allowed for the other kinds")
        String body,
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonGeometry") Geometry geometry) {

  @JsonIgnore
  @Schema(hidden = true)
  @AssertTrue(message = "geometry must be a Point for MARKER and NOTE, and a Polygon for OUTLINE")
  public boolean isGeometryMatchingKind() {
    if (kind == null || geometry == null) {
      return true; // reported by @NotNull
    }
    return switch (kind) {
      case MARKER, NOTE -> geometry instanceof Point;
      case OUTLINE -> geometry instanceof Polygon;
    };
  }

  @JsonIgnore
  @Schema(hidden = true)
  @AssertTrue(message = "body is required for NOTE and not allowed for the other kinds")
  public boolean isBodyMatchingKind() {
    if (kind == null) {
      return true; // reported by @NotNull
    }
    boolean hasBody = body != null && !body.isBlank();
    return kind == AnnotationKind.NOTE ? hasBody : body == null;
  }

  /** Only called after bean validation passed, so the casts cannot fail. */
  Shape toShape() {
    return switch (kind) {
      case MARKER -> new Marker((Point) geometry);
      case NOTE -> new Note((Point) geometry, body.trim());
      case OUTLINE -> new Outline((Polygon) geometry);
    };
  }
}
