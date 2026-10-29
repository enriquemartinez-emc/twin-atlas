package com.twinatlas.annotation.core;

import java.time.Instant;
import java.util.UUID;

/** Lifecycle states are types, so an illegal transition does not compile. */
public sealed interface Annotation {

  UUID id();

  UUID sceneId();

  String title();

  Shape shape();

  Instant createdAt();

  record Draft(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {}

  record Published(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {}

  record Archived(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {}

  /**
   * Total transform: runs only after {@code CreateAnnotationRules.evaluate} accepted the command.
   * The id and the time come in as parameters, the core never generates them.
   */
  static Draft create(UUID id, Instant now, CreateAnnotation command) {
    return new Draft(id, command.sceneId(), command.title(), command.shape(), now);
  }
}
