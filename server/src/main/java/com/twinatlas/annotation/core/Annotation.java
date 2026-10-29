package com.twinatlas.annotation.core;

import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

/** Lifecycle states are types, so an illegal transition does not compile. */
public sealed interface Annotation {

  UUID id();

  UUID sceneId();

  String title();

  Shape shape();

  Instant createdAt();

  /** The same annotation with another title. Total: every state keeps its state. */
  Annotation rename(String title);

  /** The same annotation with another shape. Used by the other transforms. */
  Annotation withShape(Shape shape);

  /** Moves the annotation. Call it only after the rules accepted the geometry for this kind. */
  default Annotation moveTo(Geometry geometry) {
    return withShape(shape().movedTo(geometry));
  }

  /** Changes the text of a note. Call it only after the rules accepted it for this kind. */
  default Annotation retext(String text) {
    return withShape(shape().withText(text));
  }

  record Draft(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {
    @Override
    public Annotation rename(String title) {
      return new Draft(id, sceneId, title, shape, createdAt);
    }

    @Override
    public Annotation withShape(Shape shape) {
      return new Draft(id, sceneId, title, shape, createdAt);
    }
  }

  record Published(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {
    @Override
    public Annotation rename(String title) {
      return new Published(id, sceneId, title, shape, createdAt);
    }

    @Override
    public Annotation withShape(Shape shape) {
      return new Published(id, sceneId, title, shape, createdAt);
    }
  }

  record Archived(UUID id, UUID sceneId, String title, Shape shape, Instant createdAt)
      implements Annotation {
    @Override
    public Annotation rename(String title) {
      return new Archived(id, sceneId, title, shape, createdAt);
    }

    @Override
    public Annotation withShape(Shape shape) {
      return new Archived(id, sceneId, title, shape, createdAt);
    }
  }

  /**
   * Total transform: runs only after {@code CreateAnnotationRules.evaluate} accepted the command.
   * The id and the time come in as parameters, the core never generates them.
   */
  static Draft create(UUID id, Instant now, CreateAnnotation command) {
    return new Draft(id, command.sceneId(), command.title(), command.shape(), now);
  }

  /**
   * Total transform: applies only the fields the command replaces. Runs after the rules accepted.
   */
  static Annotation update(Annotation current, UpdateAnnotation command) {
    Annotation updated = current;
    if (command.title() instanceof Change.Replace<String>(var title)) {
      updated = updated.rename(title);
    }
    if (command.text() instanceof Change.Replace<String>(var text)) {
      updated = updated.retext(text);
    }
    if (command.geometry() instanceof Change.Replace<Geometry>(var geometry)) {
      updated = updated.moveTo(geometry);
    }
    return updated;
  }
}
