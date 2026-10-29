package com.twinatlas.platform;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ETags here are the optimistic-lock version in quotes, for example {@code "3"}. Responses carry
 * one, and an update sends it back as {@code If-Match}.
 */
public final class Etags {

  private static final Pattern VERSION = Pattern.compile("^(?:W/)?\"(\\d{1,18})\"$");

  private Etags() {}

  public static long parseVersion(String ifMatch) {
    Matcher matcher = VERSION.matcher(ifMatch.trim());
    if (!matcher.matches()) {
      throw new ApiException(
          ApiError.REQUEST_INVALID,
          "If-Match must be an ETag from an earlier response, such as \"3\".");
    }
    return Long.parseLong(matcher.group(1));
  }
}
