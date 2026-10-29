package com.twinatlas.platform;

/**
 * A malformed request that bean validation cannot express (an unparsable cursor, a bbox with the
 * wrong number of parts). It is request shape, never a domain rule: domain rules return a {@code
 * Rejection} from the core.
 */
public class ApiException extends RuntimeException {

  private final ApiError error;

  public ApiException(ApiError error, String detail) {
    super(detail);
    this.error = error;
  }

  public ApiError error() {
    return error;
  }
}
