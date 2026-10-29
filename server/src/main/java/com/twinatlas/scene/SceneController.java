package com.twinatlas.scene;

import com.twinatlas.platform.ApiError;
import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Plain CRUD: no core, no rules beyond request validation and database constraints. */
@RestController
class SceneController {

  private final SceneRepository repository;
  private final SceneMapper mapper;
  private final Clock clock;
  private final Supplier<UUID> ids;

  SceneController(SceneRepository repository, SceneMapper mapper, Clock clock, Supplier<UUID> ids) {
    this.repository = repository;
    this.mapper = mapper;
    this.clock = clock;
    this.ids = ids;
  }

  @PostMapping("/api/scenes")
  @Operation(operationId = "createScene", summary = "Create a scene")
  @ApiResponse(
      responseCode = "201",
      description = "Created",
      content = @Content(schema = @Schema(implementation = SceneResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Request shape is invalid",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<SceneResponse> create(@Valid @RequestBody CreateSceneRequest request) {
    SceneEntity saved =
        repository.saveAndFlush(
            new SceneEntity(ids.get(), request.name().trim(), request.extent(), clock.instant()));
    return ResponseEntity.created(URI.create("/api/scenes/" + saved.getId()))
        .eTag(String.valueOf(saved.getVersion()))
        .body(mapper.toResponse(saved));
  }

  @GetMapping("/api/scenes")
  @Operation(
      operationId = "listScenes",
      summary = "List scenes",
      description = "The 100 newest scenes, newest first.")
  @ApiResponse(
      responseCode = "200",
      description = "Scenes",
      content =
          @Content(array = @ArraySchema(schema = @Schema(implementation = SceneResponse.class))))
  List<SceneResponse> list() {
    return mapper.toResponses(repository.findTop100ByOrderByCreatedAtDescIdDesc());
  }

  @GetMapping("/api/scenes/{id}")
  @Operation(operationId = "getScene", summary = "Get a scene")
  @ApiResponse(
      responseCode = "200",
      description = "The scene",
      content = @Content(schema = @Schema(implementation = SceneResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> get(@PathVariable UUID id) {
    return repository
        .findById(id)
        .<ResponseEntity<?>>map(
            scene ->
                ResponseEntity.ok()
                    .eTag(String.valueOf(scene.getVersion()))
                    .body(mapper.toResponse(scene)))
        .orElseGet(
            () ->
                ResponseEntity.status(ApiError.NOT_FOUND.status())
                    .body(Problems.of(ApiError.NOT_FOUND, "The scene does not exist.")));
  }
}
