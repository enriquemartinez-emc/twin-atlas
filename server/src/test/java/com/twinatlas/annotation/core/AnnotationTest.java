package com.twinatlas.annotation.core;

import static org.assertj.core.api.Assertions.assertThat;

import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.Shape.Marker;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnnotationTest {

  @Test
  void createBuildsADraftFromTheCommandWithTheGivenIdAndTime() {
    UUID id = UUID.fromString("00000000-0000-0000-0000-0000000000aa");
    UUID sceneId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    Instant now = Instant.parse("2026-10-28T12:00:00Z");
    Shape shape = new Marker(Geo.point(2.175, 41.405));

    Draft draft =
        Annotation.create(id, now, new CreateAnnotation(sceneId, "Cracked window", shape));

    assertThat(draft).isEqualTo(new Draft(id, sceneId, "Cracked window", shape, now));
  }
}
