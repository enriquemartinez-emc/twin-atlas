package com.twinatlas.platform.kernel;

/**
 * Stable codes for every way a use case can refuse a command. Codes, never messages or HTTP
 * statuses: {@code Problems.from} maps each one exhaustively to a problem. The name is exposed as
 * the error {@code code}, so renaming one is a breaking API change.
 */
public enum Rejection {
  SCENE_NOT_FOUND,
  INVALID_GEOMETRY,
  GEOMETRY_OUTSIDE_SCENE_EXTENT,
  TITLE_ALREADY_USED,
  ANNOTATION_NOT_FOUND,
  STALE_VERSION,
  GEOMETRY_KIND_MISMATCH,
  TEXT_ONLY_FOR_NOTES,
  UNSUPPORTED_SOURCE_ELEMENT,
  OPEN_WAY,
  UNTAGGED_ELEMENT
}
