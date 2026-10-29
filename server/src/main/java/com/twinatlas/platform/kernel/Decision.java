package com.twinatlas.platform.kernel;

public sealed interface Decision {

  record Accepted() implements Decision {}

  record Rejected(Rejection reason) implements Decision {}

  static Decision accepted() {
    return new Accepted();
  }

  static Decision rejected(Rejection reason) {
    return new Rejected(reason);
  }
}
