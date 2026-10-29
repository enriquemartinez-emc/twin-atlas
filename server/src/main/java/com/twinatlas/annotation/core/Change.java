package com.twinatlas.annotation.core;

public sealed interface Change<T> {

  record Keep<T>() implements Change<T> {}

  record Replace<T>(T value) implements Change<T> {}

  static <T> Change<T> keep() {
    return new Keep<>();
  }

  static <T> Change<T> replace(T value) {
    return new Replace<>(value);
  }

  /** A missing value means "leave it alone", which is how a partial update arrives over HTTP. */
  static <T> Change<T> ofNullable(T value) {
    return value == null ? keep() : replace(value);
  }

  default boolean replaces() {
    return this instanceof Replace<T>;
  }
}
