package com.twinatlas.annotation;

/**
 * Where an annotation is in its life, as the API and the database know it. The core models the same
 * three states as types ({@code Draft}, {@code Published}, {@code Archived}).
 */
public enum AnnotationStatus {
  DRAFT,
  PUBLISHED,
  ARCHIVED
}
