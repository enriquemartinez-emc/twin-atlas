package com.twinatlas.platform;

import org.springframework.http.HttpStatus;

public enum ApiError {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
  REQUEST_INVALID(HttpStatus.BAD_REQUEST, "Request is invalid"),
  PRECONDITION_REQUIRED(HttpStatus.PRECONDITION_REQUIRED, "A version is required"),
  INVALID_CURSOR(HttpStatus.BAD_REQUEST, "The cursor is not valid"),
  NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),
  CONCURRENT_MODIFICATION(HttpStatus.CONFLICT, "The resource was modified concurrently"),
  INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");

  private final HttpStatus status;
  private final String title;

  ApiError(HttpStatus status, String title) {
    this.status = status;
    this.title = title;
  }

  public HttpStatus status() {
    return status;
  }

  public String title() {
    return title;
  }
}
