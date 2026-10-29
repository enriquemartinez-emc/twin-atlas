package com.twinatlas.annotation.core;

/** What the shell found when it looked up the annotation. Absence is a type, not a null. */
public sealed interface CurrentAnnotation {

  record Missing() implements CurrentAnnotation {}

  /** The annotation as it is stored, and the version it is at. */
  record Present(Annotation annotation, long version) implements CurrentAnnotation {}
}
