package com.twinatlas.platform;

import org.springframework.http.ProblemDetail;

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
}
