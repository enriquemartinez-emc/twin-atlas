package com.twinatlas.annotation;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.WKBWriter;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * The read side. It bypasses the core: native SQL straight to response projections, no domain
 * types. Every spatial query uses the bbox operator {@code &&} first (it hits the GiST index), then
 * the exact predicate. Each query is timed ({@code twinatlas.annotation.query}, tag {@code type}).
 */
@Component
class AnnotationQueries {

  static final int DEFAULT_PAGE_SIZE = 50;
  static final int MAX_PAGE_SIZE = 200;
  static final int DEFAULT_NEAREST = 10;
  static final int MAX_NEAREST = 100;

  static final String TIMER = "twinatlas.annotation.query";

  /** Lower bound of metres per degree, so the pre-filter box is never smaller than the radius. */
  private static final double METRES_PER_DEGREE = 110_000;

  private static final String COLUMNS =
      "a.id, a.scene_id, a.kind, a.title, a.body, a.status, a.created_at,"
          + " ST_AsGeoJSON(a.geom) AS geojson";

  enum Filter {
    NONE,
    BBOX,
    BBOX_ACROSS_ANTIMERIDIAN,
    ZONE
  }

  private final JdbcClient jdbc;
  private final JsonMapper json;
  private final MeterRegistry meters;

  AnnotationQueries(JdbcClient jdbc, JsonMapper json, MeterRegistry meters) {
    this.jdbc = jdbc;
    this.json = json;
    this.meters = meters;
  }

  boolean sceneExists(UUID sceneId) {
    return jdbc.sql("SELECT EXISTS (SELECT 1 FROM scene WHERE id = :id)")
        .param("id", sceneId)
        .query(Boolean.class)
        .single();
  }

  /** Keyset-paginated list, optionally limited to what is visible in a map view. */
  AnnotationPage list(UUID sceneId, ViewBox view, Cursor cursor, int limit) {
    Filter filter =
        view == null
            ? Filter.NONE
            : view.crossesAntimeridian() ? Filter.BBOX_ACROSS_ANTIMERIDIAN : Filter.BBOX;
    String type = view == null ? "list" : "bbox";
    return timed(
        type,
        () -> {
          var statement = jdbc.sql(listSql(filter, cursor != null)).param("sceneId", sceneId);
          if (view != null) {
            statement =
                statement
                    .param("west", view.west())
                    .param("south", view.south())
                    .param("east", view.east())
                    .param("north", view.north());
          }
          return page(bindPaging(statement, cursor, limit).query(this::summary).list(), limit);
        });
  }

  /** Everything that intersects the zone, keyset-paginated. */
  AnnotationPage search(UUID sceneId, Polygon zone, Cursor cursor, int limit) {
    return timed(
        "intersects",
        () -> {
          byte[] wkb = new WKBWriter(2).write(zone);
          var statement =
              jdbc.sql(listSql(Filter.ZONE, cursor != null))
                  .param("sceneId", sceneId)
                  .param("zone", wkb);
          return page(bindPaging(statement, cursor, limit).query(this::summary).list(), limit);
        });
  }

  /** The N closest annotations (KNN on the GiST index), optionally within a radius in metres. */
  List<NearestAnnotation> nearest(
      UUID sceneId, double longitude, double latitude, int limit, Double maxDistanceMeters) {
    return timed(
        "nearest",
        () -> {
          var statement =
              jdbc.sql(nearestSql(maxDistanceMeters != null))
                  .param("sceneId", sceneId)
                  .param("longitude", longitude)
                  .param("latitude", latitude)
                  .param("limit", limit);
          if (maxDistanceMeters != null) {
            double cosLat = Math.max(Math.cos(Math.toRadians(latitude)), 0.01);
            statement =
                statement
                    .param("maxDistance", maxDistanceMeters)
                    .param("dLat", maxDistanceMeters / METRES_PER_DEGREE)
                    .param("dLon", Math.min(maxDistanceMeters / (METRES_PER_DEGREE * cosLat), 360));
          }
          return statement
              .query(
                  (rs, rowNum) ->
                      new NearestAnnotation(summary(rs, rowNum), rs.getDouble("distance_m")))
              .list();
        });
  }

  // ---- SQL, kept visible so the query-plan test can EXPLAIN exactly what runs ----

  static String listSql(Filter filter, boolean hasCursor) {
    StringBuilder sql =
        new StringBuilder("SELECT ")
            .append(COLUMNS)
            .append(" FROM annotation a WHERE a.scene_id = :sceneId");
    switch (filter) {
      case NONE -> {}
      case BBOX ->
          sql.append(" AND ")
              .append(intersects("ST_MakeEnvelope(:west, :south, :east, :north, 4326)"));
      case BBOX_ACROSS_ANTIMERIDIAN ->
          sql.append(" AND (")
              .append(intersects("ST_MakeEnvelope(:west, :south, 180, :north, 4326)"))
              .append(" OR ")
              .append(intersects("ST_MakeEnvelope(-180, :south, :east, :north, 4326)"))
              .append(")");
      case ZONE -> sql.append(" AND ").append(intersects("ST_GeomFromWKB(:zone, 4326)"));
    }
    if (hasCursor) {
      sql.append(" AND (a.created_at, a.id) > (:cursorAt, :cursorId)");
    }
    return sql.append(" ORDER BY a.created_at, a.id LIMIT :limit").toString();
  }

  static String nearestSql(boolean hasMaxDistance) {
    String point = "ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)";
    StringBuilder sql =
        new StringBuilder("SELECT ")
            .append(COLUMNS)
            .append(", ST_Distance(a.geom::geography, ")
            .append(point)
            .append("::geography) AS distance_m FROM annotation a WHERE a.scene_id = :sceneId");
    if (hasMaxDistance) {
      sql.append(" AND a.geom && ST_Expand(").append(point).append(", :dLon, :dLat)");
      sql.append(" AND ST_DWithin(a.geom::geography, ")
          .append(point)
          .append("::geography, :maxDistance)");
    }
    return sql.append(" ORDER BY a.geom <-> ").append(point).append(" LIMIT :limit").toString();
  }

  /** {@code &&} (index) first, then the exact test. */
  private static String intersects(String geometry) {
    return "(a.geom && " + geometry + " AND ST_Intersects(a.geom, " + geometry + "))";
  }

  // ---- plumbing ----

  private JdbcClient.StatementSpec bindPaging(
      JdbcClient.StatementSpec statement, Cursor cursor, int limit) {
    if (cursor != null) {
      statement = statement.param("cursorAt", cursor.createdAtUtc()).param("cursorId", cursor.id());
    }
    // one extra row tells us whether another page exists
    return statement.param("limit", limit + 1);
  }

  private AnnotationPage page(List<AnnotationSummary> rows, int limit) {
    if (rows.size() <= limit) {
      return new AnnotationPage(rows, null);
    }
    List<AnnotationSummary> items = List.copyOf(rows.subList(0, limit));
    AnnotationSummary last = items.get(limit - 1);
    return new AnnotationPage(items, new Cursor(last.createdAt(), last.id()).encode());
  }

  private AnnotationSummary summary(ResultSet rs, int rowNum) throws SQLException {
    return new AnnotationSummary(
        rs.getObject("id", UUID.class),
        rs.getObject("scene_id", UUID.class),
        AnnotationKind.valueOf(rs.getString("kind")),
        rs.getString("title"),
        rs.getString("body"),
        AnnotationStatus.valueOf(rs.getString("status")),
        rs.getObject("created_at", OffsetDateTime.class).toInstant(),
        json.readTree(rs.getString("geojson")));
  }

  private <T> T timed(String type, Supplier<T> query) {
    return Timer.builder(TIMER)
        .description("Duration of annotation read queries")
        .tag("type", type)
        .register(meters)
        .record(query);
  }
}
