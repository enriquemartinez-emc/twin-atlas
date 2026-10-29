package com.twinatlas.platform.config;

import com.twinatlas.geo.Wgs84;
import java.time.Clock;
import java.util.UUID;
import java.util.function.Supplier;
import org.locationtech.jts.geom.GeometryFactory;
import org.n52.jackson.datatype.jts.JtsModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class PlatformConfig {

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  Supplier<UUID> idSupplier() {
    return UUID::randomUUID;
  }

  @Bean
  GeometryFactory geometryFactory() {
    return Wgs84.FACTORY;
  }

  /** GeoJSON (de)serialization for JTS geometries. Parsed geometries carry SRID 4326. */
  @Bean
  JtsModule jtsModule(GeometryFactory geometryFactory) {
    return new JtsModule(geometryFactory);
  }
}
