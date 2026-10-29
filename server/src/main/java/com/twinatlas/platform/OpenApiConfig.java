package com.twinatlas.platform;

import com.twinatlas.platform.core.Rejection;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import java.util.Arrays;
import java.util.stream.Stream;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {

  @Bean
  OpenAPI twinAtlasApi() {
    return new OpenAPI()
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
      var code =
          (io.swagger.v3.oas.models.media.Schema<String>)
              schemas.get("ProblemResponse").getProperties().get("code");
      code.setEnum(
          Stream.concat(
                  Arrays.stream(Rejection.values()).map(Enum::name),
                  Arrays.stream(ApiError.values()).map(Enum::name))
              .sorted()
              .toList());
    };
  }
}
