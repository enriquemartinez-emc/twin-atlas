package com.twinatlas.scene;

import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
interface SceneMapper {

  SceneResponse toResponse(SceneEntity entity);

  List<SceneResponse> toResponses(List<SceneEntity> entities);
}
