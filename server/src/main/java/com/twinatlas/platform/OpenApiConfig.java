package com.twinatlas.platform;

import com.twinatlas.platform.kernel.Rejection;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.ArraySchema;
import io.swagger.v3.oas.models.media.ComposedSchema;
import io.swagger.v3.oas.models.media.Discriminator;
import io.swagger.v3.oas.models.media.NumberSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.servers.Server;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {

  @Bean
  OpenAPI twinAtlasApi() {
    return new OpenAPI()
        .addServersItem(new Server().url("/").description("Same origin as the API"))
        .info(
            new Info()
                .title("Twin Atlas API")
                .description("Explore and manage geospatial digital twins and their annotations.")
                .version("0.0.1"));
  }

  /** Puts every rejection and API error code into the problem schema, so SDKs get a typed enum. */
  @Bean
  OpenApiCustomizer problemCodes() {
    return openApi -> {
      var schemas = openApi.getComponents() == null ? null : openApi.getComponents().getSchemas();
      if (schemas == null || !schemas.containsKey("ProblemResponse")) {
        return;
      }
      @SuppressWarnings("unchecked")
      var code = (Schema<String>) schemas.get("ProblemResponse").getProperties().get("code");
      code.setEnum(
          Stream.concat(
                  Arrays.stream(Rejection.values()).map(Enum::name),
                  Arrays.stream(ApiError.values()).map(Enum::name))
              .sorted()
              .toList());
    };
  }

  /**
   * GeoJSON (RFC 7946) as real schemas, so SDK users get a discriminated union on {@code type}
   * instead of an untyped object. Fields refer to these with {@code @Schema(ref = ...)}.
   */
  @Bean
  OpenApiCustomizer geoJsonSchemas() {
    return openApi -> {
      var components = openApi.getComponents();
      if (components == null) {
        return;
      }
      Schema<?> position =
          new ArraySchema()
              .items(new NumberSchema())
              .minItems(2)
              .maxItems(3)
              .description("[longitude, latitude] or [longitude, latitude, height] in WGS 84");
      components.addSchemas("GeoJsonPoint", geometry("Point", position, "A single position"));
      components.addSchemas(
          "GeoJsonPolygon",
          geometry(
              "Polygon",
              new ArraySchema().items(new ArraySchema().items(position)),
              "Linear rings: the first is the outer boundary, closed (first position repeated)"));
      var union = new ComposedSchema();
      union.setOneOf(
          List.of(
              new Schema<>().$ref("#/components/schemas/GeoJsonPoint"),
              new Schema<>().$ref("#/components/schemas/GeoJsonPolygon")));
      union.setDiscriminator(
          new Discriminator()
              .propertyName("type")
              .mapping(
                  Map.of(
                      "Point", "#/components/schemas/GeoJsonPoint",
                      "Polygon", "#/components/schemas/GeoJsonPolygon")));
      union.setDescription("A GeoJSON geometry the API accepts: Point or Polygon");
      components.addSchemas("GeoJsonGeometry", union);
    };
  }

  private static ObjectSchema geometry(String type, Schema<?> coordinates, String description) {
    var schema = new ObjectSchema();
    schema.setDescription(description);
    schema.addProperty("type", new StringSchema()._enum(List.of(type)));
    schema.addProperty("coordinates", coordinates);
    schema.addRequiredItem("type");
    schema.addRequiredItem("coordinates");
    return schema;
  }
}
