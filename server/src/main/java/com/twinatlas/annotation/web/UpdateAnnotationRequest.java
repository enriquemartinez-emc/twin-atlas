package com.twinatlas.annotation.web;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.twinatlas.annotation.core.Change;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.locationtech.jts.geom.Geometry;

/**
 * A partial update: a field that is left out stays as it is. At least one field is required. The
 * kind of an annotation cannot change, and whether a geometry suits that kind is a domain rule.
 */
public record UpdateAnnotationRequest(
    @Size(max = 120)
        @Pattern(regexp = ".*\\S.*", message = "must not be blank")
        @Schema(nullable = true, description = "New title")
        String title,
    @Size(max = 2000)
        @Pattern(regexp = ".*\\S.*", message = "must not be blank")
        @Schema(nullable = true, description = "New text. Only notes have text")
        String body,
    @Schema(ref = "#/components/schemas/GeoJsonGeometry") Geometry geometry) {

  @JsonIgnore
  @Schema(hidden = true)
  @AssertTrue(message = "send at least one of title, body or geometry")
  public boolean isChangeRequested() {
    return title != null || body != null || geometry != null;
  }

  Change<String> titleChange() {
    return Change.ofNullable(title == null ? null : title.trim());
  }

  Change<String> textChange() {
    return Change.ofNullable(body == null ? null : body.trim());
  }

  Change<Geometry> geometryChange() {
    return Change.ofNullable(geometry);
  }
}
