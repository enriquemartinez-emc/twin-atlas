package com.twinatlas.importing;

import com.twinatlas.importing.core.OsmElement;
import com.twinatlas.importing.core.OsmElement.Node;
import com.twinatlas.importing.core.OsmElement.Unsupported;
import com.twinatlas.importing.core.OsmElement.Way;
import com.twinatlas.importing.core.Position;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/**
 * The body of an Overpass JSON answer (use {@code out geom;} so ways carry their coordinates).
 * Fields the import does not need are ignored. Request shape only: what each element means is the
 * core's business.
 */
public record OsmImportRequest(
    @NotNull
        @Size(min = 1, max = OsmImportRequest.MAX_ELEMENTS)
        @Schema(description = "Elements of an Overpass JSON answer, at most 5000 per request")
        List<Element> elements) {

  public static final int MAX_ELEMENTS = 5000;

  public record Element(
      @NotBlank @Schema(description = "node, way or relation") String type,
      @NotNull Long id,
      @Schema(description = "Latitude of a node") Double lat,
      @Schema(description = "Longitude of a node") Double lon,
      @Schema(description = "Points of a way, as produced by out geom") List<Point> geometry,
      Map<String, String> tags) {

    OsmElement toCore() {
      Map<String, String> safeTags = tags == null ? Map.of() : tags;
      if ("node".equals(type) && lat != null && lon != null) {
        return new Node(id, new Position(lon, lat), safeTags);
      }
      if ("way".equals(type) && geometry != null && !geometry.isEmpty()) {
        List<Position> points = geometry.stream().map(p -> new Position(p.lon(), p.lat())).toList();
        return new Way(id, points, safeTags);
      }
      return new Unsupported(type, id);
    }
  }

  public record Point(@NotNull Double lat, @NotNull Double lon) {}

  List<OsmElement> toCore() {
    return elements.stream().map(Element::toCore).toList();
  }
}
