package com.twinatlas.annotation.core;

import org.locationtech.jts.geom.Polygon;

public sealed interface SceneFacts {

  record NoScene() implements SceneFacts {}

  record SceneFound(Polygon extent) implements SceneFacts {}
}
