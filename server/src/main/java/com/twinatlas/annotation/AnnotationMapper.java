package com.twinatlas.annotation;

import com.twinatlas.annotation.core.Annotation.Draft;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Entity ↔ domain mapping at the shell boundary. The core never sees an entity. */
@Mapper(componentModel = "spring", imports = AnnotationKind.class)
interface AnnotationMapper {

  @Mapping(target = "kind", expression = "java(AnnotationKind.of(draft.shape()))")
  @Mapping(target = "body", expression = "java(AnnotationKind.bodyOf(draft.shape()))")
  @Mapping(target = "geom", expression = "java(draft.shape().geometry())")
  @Mapping(target = "status", constant = AnnotationEntity.DRAFT)
  AnnotationEntity toEntity(Draft draft);

  @Mapping(target = "geometry", source = "geom")
  AnnotationResponse toResponse(AnnotationEntity entity);
}
