package com.twinatlas.platform;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  public record FieldViolation(String field, String message) {}

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    ProblemDetail problem = Problems.of(ApiError.VALIDATION_FAILED, "Validation failed");
    List<FieldViolation> violations =
        ex.getBindingResult().getFieldErrors().stream()
            .map(error -> new FieldViolation(error.getField(), error.getDefaultMessage()))
            .toList();
    problem.setProperty("errors", violations);
    return handleExceptionInternal(ex, problem, headers, status, request);
  }

  @Override
  protected ResponseEntity<Object> handleHandlerMethodValidationException(
      HandlerMethodValidationException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    ProblemDetail problem = Problems.of(ApiError.VALIDATION_FAILED, "Validation failed");
    List<FieldViolation> violations =
        ex.getParameterValidationResults().stream()
            .flatMap(
                result ->
                    result.getResolvableErrors().stream()
                        .map(
                            error ->
                                new FieldViolation(
                                    result.getMethodParameter().getParameterName(),
                                    error.getDefaultMessage())))
            .toList();
    problem.setProperty("errors", violations);
    return handleExceptionInternal(ex, problem, headers, status, request);
  }

  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception ex,
      Object body,
      HttpHeaders headers,
      HttpStatusCode statusCode,
      WebRequest request) {
    // For exceptions that describe themselves (no route, wrong method...) the body is built in
    // super, so the code is added to whatever comes back.
    ResponseEntity<Object> response =
        super.handleExceptionInternal(ex, body, headers, statusCode, request);
    if (response != null
        && response.getBody() instanceof ProblemDetail problem
        && (problem.getProperties() == null
            || !problem.getProperties().containsKey(Problems.CODE))) {
      problem.setProperty(Problems.CODE, codeFor(statusCode).name());
    }
    return response;
  }

  private static ApiError codeFor(HttpStatusCode status) {
    if (status.is5xxServerError()) {
      return ApiError.INTERNAL_ERROR;
    }
    return status.value() == 404 ? ApiError.NOT_FOUND : ApiError.REQUEST_INVALID;
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ProblemDetail> handleApiException(ApiException ex) {
    return Problems.response(ex.error(), ex.getMessage());
  }

  @ExceptionHandler(OptimisticLockingFailureException.class)
  ResponseEntity<ProblemDetail> handleOptimisticLock(OptimisticLockingFailureException ex) {
    return Problems.response(
        ApiError.CONCURRENT_MODIFICATION,
        "The resource changed since you read it. Reload it and try again.");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> handleUnexpected(Exception ex) {
    log.error("Unhandled exception", ex);
    return Problems.response(ApiError.INTERNAL_ERROR, "An unexpected error occurred.");
  }
}
