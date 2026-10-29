package com.twinatlas.platform;

import org.springframework.http.HttpStatus;

/**
 * Stable codes for errors that are not domain rejections (request shape, concurrency, server
 * faults). Domain rejections have their own codes in the core. Both end up in the problem's {@code
 * code}.
 */
public enum ApiError {
  VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
  REQUEST_INVALID(HttpStatus.BAD_REQUEST, "Request is invalid"),
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
