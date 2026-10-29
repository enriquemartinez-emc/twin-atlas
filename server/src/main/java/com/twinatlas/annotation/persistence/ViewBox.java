package com.twinatlas.annotation.persistence;

import com.twinatlas.platform.ApiError;
import com.twinatlas.platform.ApiException;

/**
 * The visible area of a map in degrees. {@code west > east} means the view crosses the
 * antimeridian, so it is queried as two boxes.
 */
public record ViewBox(double west, double south, double east, double north) {

  public static ViewBox parse(String text) {
    String[] parts = text.split(",", -1);
    if (parts.length != 4) {
      throw invalid("bbox must be west,south,east,north");
    }
    double[] values = new double[4];
    for (int i = 0; i < 4; i++) {
      try {
        values[i] = Double.parseDouble(parts[i].trim());
      } catch (NumberFormatException e) {
        throw invalid("bbox must contain four numbers");
      }
    }
    ViewBox box = new ViewBox(values[0], values[1], values[2], values[3]);
    if (!box.isWithinWorld()) {
      throw invalid("bbox longitudes must be within -180..180, latitudes within -90..90");
    }
    if (box.south > box.north) {
      throw invalid("bbox south must not be greater than north");
    }
    return box;
  }

  public boolean crossesAntimeridian() {
    return west > east;
  }

  private boolean isWithinWorld() {
    return inRange(west, 180) && inRange(east, 180) && inRange(south, 90) && inRange(north, 90);
  }

  private static boolean inRange(double value, double limit) {
    return !Double.isNaN(value) && Math.abs(value) <= limit;
  }

  private static ApiException invalid(String detail) {
    return new ApiException(ApiError.VALIDATION_FAILED, detail);
  }
}
