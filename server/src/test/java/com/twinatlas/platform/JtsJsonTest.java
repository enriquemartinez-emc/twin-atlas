package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestcontainersConfiguration;
import com.twinatlas.geo.Wgs84;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class JtsJsonTest {

  @Autowired JsonMapper mapper;
  @Autowired GeometryFactory factory;

  @Test
  void pointRoundTripsAsGeoJsonWithSrid4326() throws Exception {
    Point point = factory.createPoint(new Coordinate(2.1744, 41.4036));

    String json = mapper.writeValueAsString(point);
    JsonNode tree = mapper.readTree(json);
    Point parsed = mapper.readValue(json, Point.class);

    assertThat(tree.get("type").asString()).isEqualTo("Point");
    assertThat(tree.get("coordinates").get(0).asDouble()).isEqualTo(2.1744);
    assertThat(tree.get("coordinates").get(1).asDouble()).isEqualTo(41.4036);
    assertThat(parsed.equalsExact(point)).isTrue();
    assertThat(parsed.getSRID()).isEqualTo(Wgs84.SRID);
  }

  @Test
  void polygonRoundTripsAsGeoJsonWithSrid4326() throws Exception {
    Polygon polygon =
        factory.createPolygon(
            new Coordinate[] {
              new Coordinate(2.17, 41.40),
              new Coordinate(2.18, 41.40),
              new Coordinate(2.18, 41.41),
              new Coordinate(2.17, 41.41),
              new Coordinate(2.17, 41.40)
            });

    String json = mapper.writeValueAsString(polygon);
    Polygon parsed = mapper.readValue(json, Polygon.class);

    assertThat(mapper.readTree(json).get("type").asString()).isEqualTo("Polygon");
    assertThat(parsed.equalsExact(polygon)).isTrue();
    assertThat(parsed.getSRID()).isEqualTo(Wgs84.SRID);
  }

  @Test
  void readsAGeoJsonObjectSentByAClient() throws Exception {
    String json = "{\"type\":\"Point\",\"coordinates\":[10.5,-3.25]}";

    Point parsed = mapper.readValue(json, Point.class);

    assertThat(parsed.getX()).isEqualTo(10.5);
    assertThat(parsed.getY()).isEqualTo(-3.25);
    assertThat(parsed.getSRID()).isEqualTo(4326);
  }
}
