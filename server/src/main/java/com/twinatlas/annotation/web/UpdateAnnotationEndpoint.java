package com.twinatlas.annotation.web;

import com.twinatlas.annotation.AnnotationResponse;
import com.twinatlas.annotation.core.Annotation;
import com.twinatlas.annotation.core.CurrentAnnotation;
import com.twinatlas.annotation.core.CurrentAnnotation.Missing;
import com.twinatlas.annotation.core.CurrentAnnotation.Present;
import com.twinatlas.annotation.core.UpdateAnnotation;
import com.twinatlas.annotation.core.UpdateAnnotationRules;
import com.twinatlas.annotation.core.UpdateContext;
import com.twinatlas.annotation.persistence.AnnotationEntity;
import com.twinatlas.annotation.persistence.AnnotationFacts;
import com.twinatlas.annotation.persistence.AnnotationMapper;
import com.twinatlas.annotation.persistence.AnnotationRepository;
import com.twinatlas.annotation.persistence.PersistenceConflicts;
import com.twinatlas.platform.ApiError;
import com.twinatlas.platform.Etags;
import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import com.twinatlas.platform.kernel.Decision;
import com.twinatlas.platform.kernel.Decision.Rejected;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Use case: rename, retext or move an annotation. The same five-step shell flow as creating, with
 * one difference: it loads the entity and changes that managed entity inside one transaction,
 * instead of rebuilding one. {@code If-Match} carries the version the caller last saw.
 */
@RestController
class UpdateAnnotationEndpoint {

  private final AnnotationFacts facts;
  private final AnnotationRepository repository;
  private final AnnotationMapper mapper;
  private final TransactionTemplate transaction;

  UpdateAnnotationEndpoint(
      AnnotationFacts facts,
      AnnotationRepository repository,
      AnnotationMapper mapper,
      TransactionTemplate transaction) {
    this.facts = facts;
    this.repository = repository;
    this.mapper = mapper;
    this.transaction = transaction;
  }

  @PatchMapping("/api/scenes/{sceneId}/annotations/{id}")
  @Operation(
      operationId = "updateAnnotation",
      summary = "Rename, retext or move an annotation",
      description =
          "Send only what changes. Send the ETag you read as If-Match: if the annotation changed"
              + " since, the answer is 412 and nothing is written. The answer carries the new ETag.")
  @Parameter(
      name = "If-Match",
      in = ParameterIn.HEADER,
      required = true,
      description = "The ETag from the response you read, for example \"3\"")
  @ApiResponse(
      responseCode = "200",
      description = "Updated",
      content = @Content(schema = @Schema(implementation = AnnotationResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "VALIDATION_FAILED or REQUEST_INVALID",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND or ANNOTATION_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "409",
      description = "TITLE_ALREADY_USED or CONCURRENT_MODIFICATION",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "412",
      description = "STALE_VERSION",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "422",
      description =
          "INVALID_GEOMETRY, GEOMETRY_OUTSIDE_SCENE_EXTENT, GEOMETRY_KIND_MISMATCH or TEXT_ONLY_FOR_NOTES",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "428",
      description = "PRECONDITION_REQUIRED: If-Match is missing",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> update(
      @PathVariable UUID sceneId,
      @PathVariable UUID id,
      @RequestHeader(value = "If-Match", required = false) String ifMatch,
      @Valid @RequestBody UpdateAnnotationRequest request) {
    if (ifMatch == null) {
      return Problems.response(
          ApiError.PRECONDITION_REQUIRED,
          "Send the ETag you read as If-Match, so an update never overwrites a newer version.");
    }
    long expectedVersion = Etags.parseVersion(ifMatch);
    try {
      return transaction.execute(status -> apply(sceneId, id, expectedVersion, request));
    } catch (DataIntegrityViolationException e) {
      var rejection = PersistenceConflicts.rejectionFor(e);
      if (rejection.isPresent()) return Problems.from(rejection.get());
      throw e;
    }
  }

  private ResponseEntity<?> apply(
      UUID sceneId, UUID id, long expectedVersion, UpdateAnnotationRequest request) {
    // 1. load context facts (the entity stays managed for the whole transaction)
    Optional<AnnotationEntity> loaded = repository.findByIdAndSceneId(id, sceneId);
    CurrentAnnotation current =
        loaded
            .<CurrentAnnotation>map(
                entity -> new Present(mapper.toDomain(entity), entity.getVersion()))
            .orElseGet(Missing::new);
    UpdateAnnotation command =
        new UpdateAnnotation(
            sceneId,
            id,
            expectedVersion,
            request.titleChange(),
            request.textChange(),
            request.geometryChange());
    UpdateContext context =
        facts.forUpdate(
            sceneId, id, current, command.title().replaces() ? request.title().trim() : null);

    // 2. evaluate
    Decision decision = UpdateAnnotationRules.evaluate(command, context);
    // 3. reject
    if (decision instanceof Rejected(var reason)) return Problems.from(reason);
    // 4. apply the total transform
    AnnotationEntity entity = loaded.orElseThrow();
    Annotation updated = Annotation.update(mapper.toDomain(entity), command);
    // 5. persist (the version column rejects a lost race), then respond
    mapper.apply(updated, entity);
    repository.flush();
    return ResponseEntity.ok()
        .eTag(String.valueOf(entity.getVersion()))
        .body(mapper.toResponse(entity));
  }
}
