package com.twinatlas.annotation.core;

import org.locationtech.jts.geom.Polygon;

/** What the shell learned about the target scene. Absence is a type, not a null or a flag. */
public sealed interface SceneFacts {

  record NoScene() implements SceneFacts {}

  record SceneFound(Polygon extent) implements SceneFacts {}
}
