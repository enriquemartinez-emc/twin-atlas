package com.twinatlas.annotation.persistence;

import com.twinatlas.platform.ApiError;
import com.twinatlas.platform.ApiException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

/**
 * Keyset position: the last row of the previous page. Opaque to clients. Microseconds are the
 * precision of PostgreSQL's timestamptz, so the position round-trips exactly.
 */
public record Cursor(Instant createdAt, UUID id) {

  public String encode() {
    long micros = ChronoUnit.MICROS.between(Instant.EPOCH, createdAt);
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString((micros + ":" + id).getBytes(StandardCharsets.UTF_8));
  }

  public static Cursor decode(String text) {
    try {
      String[] parts =
          new String(Base64.getUrlDecoder().decode(text), StandardCharsets.UTF_8).split(":", 2);
      Instant at = Instant.EPOCH.plus(Long.parseLong(parts[0]), ChronoUnit.MICROS);
      return new Cursor(at, UUID.fromString(parts[1]));
    } catch (RuntimeException e) {
      throw new ApiException(ApiError.INVALID_CURSOR, "The cursor is not valid.");
    }
  }

  public OffsetDateTime createdAtUtc() {
    return OffsetDateTime.ofInstant(createdAt, ZoneOffset.UTC);
  }
}
