package com.twinatlas.annotation.core;

import java.time.Instant;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;

public sealed interface Annotation {

  UUID id();

  UUID sceneId();

  String title();

  Shape shape();

  Instant createdAt();

  Annotation rename(String title);

  Annotation withShape(Shape shape);

  default Annotation moveTo(Geometry geometry) {
    return withShape(shape().movedTo(geometry));
  }

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

  static Draft create(UUID id, Instant now, CreateAnnotation command) {
    return new Draft(id, command.sceneId(), command.title(), command.shape(), now);
  }

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
