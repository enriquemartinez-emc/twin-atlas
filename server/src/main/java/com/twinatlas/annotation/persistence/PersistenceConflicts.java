package com.twinatlas.annotation.persistence;

import com.twinatlas.platform.kernel.Rejection;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * The database is the final enforcer of the rules that can race. When a constraint fires after the
 * core accepted the command, translate it into the same rejection the core would have produced.
 */
public final class PersistenceConflicts {

  private static final Pattern CONSTRAINT = Pattern.compile("constraint \"([^\"]+)\"");

  private PersistenceConflicts() {}

  public static Optional<Rejection> rejectionFor(DataIntegrityViolationException exception) {
    return constraintName(exception)
        .flatMap(
            name ->
                switch (name) {
                  case "ux_annotation_scene_title" -> Optional.of(Rejection.TITLE_ALREADY_USED);
                  case "fk_annotation_scene" -> Optional.of(Rejection.SCENE_NOT_FOUND);
                  default -> Optional.empty();
                });
  }

  private static Optional<String> constraintName(DataIntegrityViolationException exception) {
    if (exception.getCause() instanceof ConstraintViolationException violation
        && violation.getConstraintName() != null) {
      return Optional.of(violation.getConstraintName());
    }
    Throwable root = NestedExceptionUtils.getMostSpecificCause(exception);
    String message = root.getMessage();
    if (message == null) {
      return Optional.empty();
    }
    Matcher matcher = CONSTRAINT.matcher(message);
    return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
  }
}
