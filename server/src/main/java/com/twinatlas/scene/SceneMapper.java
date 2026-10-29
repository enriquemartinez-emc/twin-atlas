package com.twinatlas.scene;

import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
interface SceneMapper {

  SceneResponse toResponse(SceneEntity entity);
}
