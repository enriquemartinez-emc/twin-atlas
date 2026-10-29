package com.twinatlas.platform;

import com.twinatlas.platform.core.Rejection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

/** Builds RFC 7807 problems. The {@code code} property is the stable, machine-readable error. */
public final class Problems {

  public static final String CODE = "code";

  private Problems() {}

  public static ProblemDetail of(ApiError error, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(error.status(), detail);
    problem.setTitle(error.title());
    problem.setProperty(CODE, error.name());
    return problem;
  }

  /**
   * The single exhaustive mapping from a domain rejection to a problem. A new code must be mapped
   * here.
   */
  public static ResponseEntity<ProblemDetail> from(Rejection rejection) {
    HttpStatus status =
        switch (rejection) {
          case SCENE_NOT_FOUND, ANNOTATION_NOT_FOUND -> HttpStatus.NOT_FOUND;
          case INVALID_GEOMETRY,
              GEOMETRY_OUTSIDE_SCENE_EXTENT,
              GEOMETRY_KIND_MISMATCH,
              TEXT_ONLY_FOR_NOTES ->
              HttpStatus.UNPROCESSABLE_ENTITY;
          case STALE_VERSION -> HttpStatus.PRECONDITION_FAILED;
          case TITLE_ALREADY_USED -> HttpStatus.CONFLICT;
        };
    String title =
        switch (rejection) {
          case SCENE_NOT_FOUND -> "Scene not found";
          case INVALID_GEOMETRY -> "Invalid geometry";
          case GEOMETRY_OUTSIDE_SCENE_EXTENT -> "Geometry outside the scene";
          case TITLE_ALREADY_USED -> "Title already used";
          case ANNOTATION_NOT_FOUND -> "Annotation not found";
          case STALE_VERSION -> "Annotation changed";
          case GEOMETRY_KIND_MISMATCH -> "Wrong kind of shape";
          case TEXT_ONLY_FOR_NOTES -> "Text is only for notes";
        };
    String detail =
        switch (rejection) {
          case SCENE_NOT_FOUND -> "The scene does not exist.";
          case INVALID_GEOMETRY ->
              "The geometry is empty, self-intersecting or outside the WGS 84 world.";
          case GEOMETRY_OUTSIDE_SCENE_EXTENT ->
              "The geometry is not fully inside the scene extent.";
          case TITLE_ALREADY_USED -> "Another annotation in this scene already uses this title.";
          case ANNOTATION_NOT_FOUND -> "The annotation does not exist in this scene.";
          case STALE_VERSION ->
              "The annotation changed since you read it. Load the latest version and try again.";
          case GEOMETRY_KIND_MISMATCH -> "Markers and notes need a point, outlines need a polygon.";
          case TEXT_ONLY_FOR_NOTES -> "Only notes have text.";
        };
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(title);
    problem.setProperty(CODE, rejection.name());
    return ResponseEntity.status(status).body(problem);
  }
}
