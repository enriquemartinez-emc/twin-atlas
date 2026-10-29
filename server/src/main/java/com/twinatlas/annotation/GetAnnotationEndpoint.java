package com.twinatlas.annotation;

import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import com.twinatlas.platform.kernel.Rejection;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Reads one annotation and its ETag, which is what an update needs to send back as If-Match. */
@RestController
class GetAnnotationEndpoint {

  private final AnnotationRepository repository;
  private final AnnotationQueries queries;
  private final AnnotationMapper mapper;

  GetAnnotationEndpoint(
      AnnotationRepository repository, AnnotationQueries queries, AnnotationMapper mapper) {
    this.repository = repository;
    this.queries = queries;
    this.mapper = mapper;
  }

  @GetMapping("/api/scenes/{sceneId}/annotations/{id}")
  @Operation(
      operationId = "getAnnotation",
      summary = "Get one annotation",
      description = "The ETag header is the version to send back as If-Match when updating.")
  @ApiResponse(
      responseCode = "200",
      content = @Content(schema = @Schema(implementation = AnnotationResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND or ANNOTATION_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> get(@PathVariable UUID sceneId, @PathVariable UUID id) {
    return repository
        .findByIdAndSceneId(id, sceneId)
        .<ResponseEntity<?>>map(
            entity ->
                ResponseEntity.ok()
                    .eTag(String.valueOf(entity.getVersion()))
                    .body(mapper.toResponse(entity)))
        .orElseGet(
            () ->
                Problems.from(
                    queries.sceneExists(sceneId)
                        ? Rejection.ANNOTATION_NOT_FOUND
                        : Rejection.SCENE_NOT_FOUND));
  }
}
