package com.twinatlas.annotation.core;

import java.util.UUID;

public record CreateAnnotation(UUID sceneId, String title, Shape shape) {}
