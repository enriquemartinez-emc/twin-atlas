package com.twinatlas.platform;

import com.twinatlas.platform.kernel.Rejection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

public final class Problems {

  public static final String CODE = "code";

  private Problems() {}

  public static ProblemDetail of(ApiError error, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(error.status(), detail);
    problem.setTitle(error.title());
    problem.setProperty(CODE, error.name());
    return problem;
  }

  public static ResponseEntity<ProblemDetail> response(ApiError error, String detail) {
    ProblemDetail problem = of(error, detail);
    return ResponseEntity.status(error.status()).body(problem);
  }

  private record Mapping(HttpStatus status, String title, String detail) {}

  public static ResponseEntity<ProblemDetail> from(Rejection rejection) {
    Mapping mapping = mappingOf(rejection);
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(mapping.status(), mapping.detail());
    problem.setTitle(mapping.title());
    problem.setProperty(CODE, rejection.name());
    return ResponseEntity.status(mapping.status()).body(problem);
  }

  private static Mapping mappingOf(Rejection rejection) {
    return switch (rejection) {
      case SCENE_NOT_FOUND ->
          new Mapping(HttpStatus.NOT_FOUND, "Scene not found", "The scene does not exist.");
      case ANNOTATION_NOT_FOUND ->
          new Mapping(
              HttpStatus.NOT_FOUND,
              "Annotation not found",
              "The annotation does not exist in this scene.");
      case INVALID_GEOMETRY ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Invalid geometry",
              "The geometry is empty, self-intersecting or outside the WGS 84 world.");
      case GEOMETRY_OUTSIDE_SCENE_EXTENT ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Geometry outside the scene",
              "The geometry is not fully inside the scene extent.");
      case GEOMETRY_KIND_MISMATCH ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Wrong kind of shape",
              "Markers and notes need a point, outlines need a polygon.");
      case TEXT_ONLY_FOR_NOTES ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT, "Text is only for notes", "Only notes have text.");
      case UNSUPPORTED_SOURCE_ELEMENT ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Unsupported source element",
              "Only nodes and ways can be imported, and they need coordinates.");
      case OPEN_WAY ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Way is not an area",
              "A way becomes an outline only when it is a closed ring of at least four points.");
      case UNTAGGED_ELEMENT ->
          new Mapping(
              HttpStatus.UNPROCESSABLE_CONTENT,
              "Element has no tags",
              "An element with no tags says nothing about the place, so it is not imported.");
      case STALE_VERSION ->
          new Mapping(
              HttpStatus.PRECONDITION_FAILED,
              "Annotation changed",
              "The annotation changed since you read it. Load the latest version and try again.");
      case TITLE_ALREADY_USED ->
          new Mapping(
              HttpStatus.CONFLICT,
              "Title already used",
              "Another annotation in this scene already uses this title.");
    };
  }
}
