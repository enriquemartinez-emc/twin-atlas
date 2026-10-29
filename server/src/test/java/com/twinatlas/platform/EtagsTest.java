package com.twinatlas.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class EtagsTest {

  @Test
  void readsTheVersionFromAQuotedEtag() {
    assertThat(Etags.parseVersion("\"0\"")).isZero();
    assertThat(Etags.parseVersion("\"42\"")).isEqualTo(42);
  }

  @Test
  void acceptsAWeakEtagAndSurroundingSpaces() {
    assertThat(Etags.parseVersion("W/\"7\"")).isEqualTo(7);
    assertThat(Etags.parseVersion("  \"7\"  ")).isEqualTo(7);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"", "3", "\"x\"", "\"-1\"", "\"3\" \"4\"", "*", "\"1234567890123456789012\""})
  void refusesAnythingElseWithARequestInvalidProblem(String header) {
    assertThatThrownBy(() -> Etags.parseVersion(header))
        .isInstanceOfSatisfying(
            ApiException.class, e -> assertThat(e.error()).isEqualTo(ApiError.REQUEST_INVALID));
  }
}
