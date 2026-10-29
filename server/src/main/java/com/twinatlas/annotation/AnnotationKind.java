package com.twinatlas.annotation;

import com.twinatlas.annotation.core.Shape;
import com.twinatlas.annotation.core.Shape.Marker;
import com.twinatlas.annotation.core.Shape.Note;
import com.twinatlas.annotation.core.Shape.Outline;

public enum AnnotationKind {
  MARKER,
  NOTE,
  OUTLINE;

  public static AnnotationKind of(Shape shape) {
    return switch (shape) {
      case Marker _ -> MARKER;
      case Note _ -> NOTE;
      case Outline _ -> OUTLINE;
    };
  }

  public static String bodyOf(Shape shape) {
    return shape instanceof Note note ? note.text() : null;
  }
}
