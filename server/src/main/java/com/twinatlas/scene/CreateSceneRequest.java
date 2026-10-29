package com.twinatlas.scene;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.locationtech.jts.geom.Polygon;

public record CreateSceneRequest(
    @NotBlank @Size(max = 120) String name,
    @NotNull @Schema(type = "object", description = "GeoJSON Polygon (RFC 7946), WGS 84")
        Polygon extent) {

  @JsonIgnore
  @Schema(hidden = true)
  @AssertTrue(message = "extent must be a non-empty, valid polygon inside the WGS 84 world")
  public boolean isExtentValid() {
    if (extent == null) {
      return true; // reported by @NotNull
    }
    var box = extent.getEnvelopeInternal();
    return !extent.isEmpty()
        && extent.isValid()
        && box.getMinX() >= -180
        && box.getMaxX() <= 180
        && box.getMinY() >= -90
        && box.getMaxY() <= 90;
  }
}
