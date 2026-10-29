package com.twinatlas.annotation.core;

public sealed interface CurrentAnnotation {

  record Missing() implements CurrentAnnotation {}

  record Present(Annotation annotation, long version) implements CurrentAnnotation {}
}
