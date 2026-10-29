package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.TestcontainersConfiguration;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PostgisSmokeTest {

  @Autowired JdbcClient jdbc;
  @Autowired Clock clock;
  @Autowired Supplier<UUID> idSupplier;

  @Test
  void postgisIsAvailableThroughTheAppDatasource() {
    String version = jdbc.sql("SELECT postgis_version()").query(String.class).single();

    assertThat(version).startsWith("3.");
  }

  @Test
  void flywayRanTheInitialMigration() {
    Integer applied =
        jdbc.sql("SELECT count(*) FROM flyway_schema_history WHERE success")
            .query(Integer.class)
            .single();

    assertThat(applied).isGreaterThanOrEqualTo(1);
  }

  @Test
  void clockIsUtcAndIdsAreUnique() {
    assertThat(clock.getZone()).isEqualTo(ZoneOffset.UTC);
    assertThat(idSupplier.get()).isNotEqualTo(idSupplier.get());
  }
}
