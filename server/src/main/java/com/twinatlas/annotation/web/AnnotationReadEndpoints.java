package com.twinatlas.annotation.web;

import com.twinatlas.annotation.AnnotationPage;
import com.twinatlas.annotation.NearestAnnotation;
import com.twinatlas.annotation.persistence.AnnotationQueries;
import com.twinatlas.annotation.persistence.Cursor;
import com.twinatlas.annotation.persistence.ViewBox;
import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import com.twinatlas.platform.kernel.Rejection;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Spatial reads. No core, no domain types: validate the request shape, query, return. */
@RestController
@RequestMapping("/api/scenes/{sceneId}/annotations")
class AnnotationReadEndpoints {

  private final AnnotationQueries queries;

  AnnotationReadEndpoints(AnnotationQueries queries) {
    this.queries = queries;
  }

  @GetMapping
  @Operation(
      operationId = "listAnnotations",
      summary = "List annotations, or the ones visible in a map view",
      description =
          "Keyset-paginated, ordered by creation time. With `bbox` only annotations that intersect"
              + " the view are returned. A west value greater than east crosses the antimeridian.")
  @ApiResponse(
      responseCode = "200",
      content = @Content(schema = @Schema(implementation = AnnotationPage.class)))
  @ApiResponse(
      responseCode = "400",
      description = "VALIDATION_FAILED or INVALID_CURSOR",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> list(
      @PathVariable UUID sceneId,
      @Parameter(description = "west,south,east,north in degrees") @RequestParam(required = false)
          String bbox,
      @RequestParam(defaultValue = "" + AnnotationQueries.DEFAULT_PAGE_SIZE)
          @Min(1)
          @Max(AnnotationQueries.MAX_PAGE_SIZE)
          int limit,
      @Parameter(description = "`nextCursor` of the previous page") @RequestParam(required = false)
          String cursor) {
    ViewBox view = bbox == null ? null : ViewBox.parse(bbox);
    Cursor position = cursor == null ? null : Cursor.decode(cursor);
    if (!queries.sceneExists(sceneId)) return Problems.from(Rejection.SCENE_NOT_FOUND);
    return ResponseEntity.ok(queries.list(sceneId, view, position, limit));
  }

  @GetMapping("/nearest")
  @Operation(
      operationId = "nearestAnnotations",
      summary = "The N annotations closest to a point",
      description = "Ordered by distance (KNN index scan). `distanceMeters` is geodesic.")
  @ApiResponse(
      responseCode = "200",
      content = @Content(schema = @Schema(implementation = NearestAnnotation[].class)))
  @ApiResponse(
      responseCode = "400",
      description = "VALIDATION_FAILED",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> nearest(
      @PathVariable UUID sceneId,
      @RequestParam @DecimalMin("-180") @DecimalMax("180") double longitude,
      @RequestParam @DecimalMin("-90") @DecimalMax("90") double latitude,
      @RequestParam(defaultValue = "" + AnnotationQueries.DEFAULT_NEAREST)
          @Min(1)
          @Max(AnnotationQueries.MAX_NEAREST)
          int limit,
      @Parameter(description = "Only annotations within this radius")
          @RequestParam(required = false)
          @Positive
          Double maxDistanceMeters) {
    if (!queries.sceneExists(sceneId)) return Problems.from(Rejection.SCENE_NOT_FOUND);
    List<NearestAnnotation> result =
        queries.nearest(sceneId, longitude, latitude, limit, maxDistanceMeters);
    return ResponseEntity.ok(result);
  }

  @PostMapping("/search")
  @Operation(
      operationId = "searchAnnotations",
      summary = "Annotations that intersect a zone",
      description = "POST because the zone is a GeoJSON polygon. Keyset-paginated like the list.")
  @ApiResponse(
      responseCode = "200",
      content = @Content(schema = @Schema(implementation = AnnotationPage.class)))
  @ApiResponse(
      responseCode = "400",
      description = "VALIDATION_FAILED or INVALID_CURSOR",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> search(@PathVariable UUID sceneId, @Valid @RequestBody SearchRequest request) {
    Cursor position = request.cursor() == null ? null : Cursor.decode(request.cursor());
    int limit = request.limit() == null ? AnnotationQueries.DEFAULT_PAGE_SIZE : request.limit();
    if (!queries.sceneExists(sceneId)) return Problems.from(Rejection.SCENE_NOT_FOUND);
    return ResponseEntity.ok(queries.search(sceneId, request.zone(), position, limit));
  }
}
