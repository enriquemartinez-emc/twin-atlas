package com.twinatlas.annotation.web;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.twinatlas.annotation.persistence.AnnotationQueries;
import com.twinatlas.geo.Wgs84;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.locationtech.jts.geom.Polygon;

public record SearchRequest(
    @NotNull @Schema(ref = "#/components/schemas/GeoJsonPolygon") Polygon zone,
    @Min(1) @Max(AnnotationQueries.MAX_PAGE_SIZE) Integer limit,
    String cursor) {

  @JsonIgnore
  @Schema(hidden = true)
  @AssertTrue(message = "zone must be a non-empty, valid polygon inside the WGS 84 world")
  public boolean isZoneValid() {
    return zone == null || Wgs84.isValid(zone);
  }
}
