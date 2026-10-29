package com.twinatlas.annotation.persistence;

import com.twinatlas.annotation.AnnotationKind;
import com.twinatlas.annotation.AnnotationResponse;
import com.twinatlas.annotation.core.Annotation;
import com.twinatlas.annotation.core.Annotation.Archived;
import com.twinatlas.annotation.core.Annotation.Draft;
import com.twinatlas.annotation.core.Annotation.Published;
import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", imports = AnnotationKind.class)
public interface AnnotationMapper {

  @Mapping(target = "kind", expression = "java(AnnotationKind.of(draft.shape()))")
  @Mapping(target = "body", expression = "java(AnnotationKind.bodyOf(draft.shape()))")
  @Mapping(target = "geom", expression = "java(draft.shape().geometry())")
  @Mapping(target = "status", constant = "DRAFT")
  AnnotationEntity toEntity(Draft draft);

  @Mapping(target = "geometry", source = "geom")
  AnnotationResponse toResponse(AnnotationEntity entity);

  /**
   * Writes an updated annotation onto the entity that was loaded, so Hibernate sees a change to a
   * managed entity. Identity, scene, kind, status, creation time and version are never touched.
   */
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "sceneId", ignore = true)
  @Mapping(target = "kind", ignore = true)
  @Mapping(target = "status", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "version", ignore = true)
  @Mapping(target = "title", expression = "java(annotation.title())")
  @Mapping(target = "body", expression = "java(AnnotationKind.bodyOf(annotation.shape()))")
  @Mapping(target = "geom", expression = "java(annotation.shape().geometry())")
  void apply(Annotation annotation, @MappingTarget AnnotationEntity entity);

  default Annotation toDomain(AnnotationEntity entity) {
    Shape shape = shapeOf(entity);
    return switch (entity.getStatus()) {
      case DRAFT ->
          new Draft(
              entity.getId(), entity.getSceneId(), entity.getTitle(), shape, entity.getCreatedAt());
      case PUBLISHED ->
          new Published(
              entity.getId(), entity.getSceneId(), entity.getTitle(), shape, entity.getCreatedAt());
      case ARCHIVED ->
          new Archived(
              entity.getId(), entity.getSceneId(), entity.getTitle(), shape, entity.getCreatedAt());
    };
  }

  private Shape shapeOf(AnnotationEntity entity) {
    return switch (entity.getKind()) {
      case MARKER -> new Marker((Point) entity.getGeom());
      case NOTE -> new Note((Point) entity.getGeom(), entity.getBody());
      case OUTLINE -> new Outline((Polygon) entity.getGeom());
    };
  }
}
