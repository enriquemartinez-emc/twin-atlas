package com.twinatlas.importing;

import com.twinatlas.annotation.core.Annotation;
import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import com.twinatlas.importing.OsmImportResponse.ItemRejection;
import com.twinatlas.importing.core.ImportContext;
import com.twinatlas.importing.core.ImportRules;
import com.twinatlas.importing.core.ImportRules.Outcome;
import com.twinatlas.importing.core.OsmElement;
import com.twinatlas.importing.core.OsmTransform;
import com.twinatlas.platform.ProblemResponse;
import com.twinatlas.platform.Problems;
import com.twinatlas.platform.kernel.Rejection;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.locationtech.jts.io.WKBWriter;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class OsmImportEndpoint {

  /** Same constraint the annotation slice relies on, so a concurrent duplicate is skipped, too. */
  private static final String INSERT =
      "INSERT INTO annotation (id, scene_id, kind, title, body, geom, status, version, created_at)"
          + " VALUES (:id, :sceneId, :kind, :title, :body, ST_GeomFromWKB(:geom, 4326),"
          + " 'DRAFT', 0, :createdAt) ON CONFLICT DO NOTHING";

  private final ImportFacts facts;
  private final NamedParameterJdbcTemplate jdbc;
  private final TransactionTemplate transaction;
  private final Clock clock;
  private final Supplier<UUID> ids;

  OsmImportEndpoint(
      ImportFacts facts,
      NamedParameterJdbcTemplate jdbc,
      TransactionTemplate transaction,
      Clock clock,
      Supplier<UUID> ids) {
    this.facts = facts;
    this.jdbc = jdbc;
    this.transaction = transaction;
    this.clock = clock;
    this.ids = ids;
  }

  @PostMapping("/api/scenes/{sceneId}/imports/osm")
  @Operation(
      operationId = "importOsm",
      summary = "Import OpenStreetMap elements into a scene",
      description =
          "Turns nodes into markers (notes when they carry a description) and closed ways into"
              + " outlines. Elements that cannot be imported are reported one by one with a stable"
              + " code, and do not stop the others. Importing the same extract twice creates"
              + " nothing the second time. Map data © OpenStreetMap contributors, ODbL.")
  @ApiResponse(
      responseCode = "200",
      description = "Processed. Check rejected for elements that were skipped.",
      content = @Content(schema = @Schema(implementation = OsmImportResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Request shape is invalid, or more than 5000 elements",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "SCENE_NOT_FOUND",
      content = @Content(schema = @Schema(implementation = ProblemResponse.class)))
  ResponseEntity<?> importOsm(
      @PathVariable UUID sceneId, @Valid @RequestBody OsmImportRequest request) {
    List<OsmElement> elements = request.toCore();

    ImportContext context =
        facts.forImport(sceneId, elements.stream().map(OsmTransform::titleFor).toList());
    Outcome outcome = ImportRules.evaluate(sceneId, elements, context);
    if (!(outcome instanceof Outcome.Planned(var plan))) {
      return Problems.from(Rejection.SCENE_NOT_FOUND);
    }
    Instant now = clock.instant();
    List<Draft> drafts =
        plan.accepted().stream().map(a -> Annotation.create(ids.get(), now, a.command())).toList();
    boolean[] inserted = persist(drafts);

    List<ItemRejection> rejected = new ArrayList<>();
    plan.rejected().forEach(r -> rejected.add(new ItemRejection(r.reference(), r.reason())));
    int imported = 0;
    for (int i = 0; i < drafts.size(); i++) {
      if (inserted[i]) {
        imported++;
      } else {
        // The title was taken between the facts query and the insert: the unique index decided.
        rejected.add(
            new ItemRejection(plan.accepted().get(i).reference(), Rejection.TITLE_ALREADY_USED));
      }
    }
    return ResponseEntity.ok(new OsmImportResponse(elements.size(), imported, rejected));
  }

  /** One round trip for the batch. The unique index skips duplicates instead of failing. */
  private boolean[] persist(List<Draft> drafts) {
    if (drafts.isEmpty()) {
      return new boolean[0];
    }
    MapSqlParameterSource[] rows =
        drafts.stream().map(this::row).toArray(MapSqlParameterSource[]::new);
    int[] counts = transaction.execute(status -> jdbc.batchUpdate(INSERT, rows));
    boolean[] inserted = new boolean[counts.length];
    for (int i = 0; i < counts.length; i++) {
      inserted[i] = counts[i] > 0;
    }
    return inserted;
  }

  private MapSqlParameterSource row(Draft draft) {
    Shape shape = draft.shape();
    return new MapSqlParameterSource()
        .addValue("id", draft.id())
        .addValue("sceneId", draft.sceneId())
        .addValue("kind", kindOf(shape))
        .addValue("title", draft.title())
        .addValue("body", shape instanceof Note note ? note.text() : null)
        .addValue("geom", new WKBWriter().write(shape.geometry()))
        .addValue("createdAt", Timestamp.from(draft.createdAt()));
  }

  private static String kindOf(Shape shape) {
    return switch (shape) {
      case Marker _ -> "MARKER";
      case Note _ -> "NOTE";
      case Outline _ -> "OUTLINE";
    };
  }
}
