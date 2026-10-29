package com.twinatlas.annotation;

import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;

/**
 * The kind of annotation as the API and the database know it. The core uses {@link Shape} types.
 */
public enum AnnotationKind {
  MARKER,
  NOTE,
  OUTLINE;

  static AnnotationKind of(Shape shape) {
    return switch (shape) {
      case Marker marker -> MARKER;
      case Note note -> NOTE;
      case Outline outline -> OUTLINE;
    };
  }

  /** Only notes carry text. */
  static String bodyOf(Shape shape) {
    return shape instanceof Note note ? note.text() : null;
  }
}
