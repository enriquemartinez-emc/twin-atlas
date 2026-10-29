package com.twinatlas.platform;

import java.time.Clock;
import java.util.UUID;
import java.util.function.Supplier;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.n52.jackson.datatype.jts.JtsModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Infrastructure beans the shell passes into the pure core: time, ids and the geometry factory. */
@Configuration(proxyBeanMethods = false)
public class PlatformConfig {

  /** Storage and API use WGS 84 (see ADR 0001). */
  public static final int SRID = 4326;

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
    return new GeometryFactory(new PrecisionModel(), SRID);
  }

  /** GeoJSON (de)serialization for JTS geometries. Parsed geometries carry SRID 4326. */
  @Bean
  JtsModule jtsModule(GeometryFactory geometryFactory) {
    return new JtsModule(geometryFactory);
  }
}
