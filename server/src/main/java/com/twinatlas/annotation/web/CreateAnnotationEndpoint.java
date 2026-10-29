package com.twinatlas.annotation.web;

import com.twinatlas.annotation.AnnotationResponse;
import com.twinatlas.annotation.core.Annotation;
import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.CreateAnnotation;
import com.twinatlas.annotation.core.CreateAnnotationRules;
import com.twinatlas.annotation.core.CreateContext;
import com.twinatlas.annotation.persistence.AnnotationEntity;
import com.twinatlas.annotation.persistence.AnnotationFacts;
import com.twinatlas.annotation.persistence.AnnotationMapper;
import com.twinatlas.annotation.persistence.AnnotationRepository;
import com.twinatlas.annotation.persistence.PersistenceConflicts;
import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import com.twinatlas.platform.kernel.Decision;
import com.twinatlas.platform.kernel.Decision.Rejected;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Clock;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CreateAnnotationEndpoint {

  private final AnnotationFacts facts;
  private final AnnotationRepository repository;
  private final AnnotationMapper mapper;
  private final Clock clock;
  private final Supplier<UUID> ids;

  CreateAnnotationEndpoint(
      AnnotationFacts facts,
      AnnotationRepository repository,
      AnnotationMapper mapper,
      Clock clock,
      Supplier<UUID> ids) {
    this.facts = facts;
    this.repository = repository;
    this.mapper = mapper;
    this.clock = clock;
    this.ids = ids;
  }

  @PostMapping("/api/scenes/{sceneId}/annotations")
  @Operation(
      operationId = "createAnnotation",
      summary = "Create an annotation in a scene",
      description =
          "Creates a draft marker, note or outline. The ETag is the optimistic-lock version.")
  @ApiResponse(
      responseCode = "201",
      description = "Created",
      content = @Content(schema = @Schema(implementation = AnnotationResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Request shape is invalid",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "409",
      description = "TITLE_ALREADY_USED",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "422",
      description = "INVALID_GEOMETRY or GEOMETRY_OUTSIDE_SCENE_EXTENT",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> create(
      @PathVariable UUID sceneId, @Valid @RequestBody CreateAnnotationRequest request) {
    CreateAnnotation command =
        new CreateAnnotation(sceneId, request.title().trim(), request.toShape());

    CreateContext context = facts.forCreate(sceneId, command.title());
    Decision decision = CreateAnnotationRules.evaluate(command, context);
    if (decision instanceof Rejected(var reason)) return Problems.from(reason);
    Draft draft = Annotation.create(ids.get(), clock.instant(), command);
    AnnotationEntity saved;
    try {
      saved = repository.saveAndFlush(mapper.toEntity(draft));
    } catch (DataIntegrityViolationException e) {
      var rejection = PersistenceConflicts.rejectionFor(e);
      if (rejection.isPresent()) return Problems.from(rejection.get());
      throw e;
    }
    return ResponseEntity.created(
            URI.create("/api/scenes/" + sceneId + "/annotations/" + saved.getId()))
        .eTag(String.valueOf(saved.getVersion()))
        .body(mapper.toResponse(saved));
  }
}
