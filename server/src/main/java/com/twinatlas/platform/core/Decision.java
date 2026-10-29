package com.twinatlas.platform.core;

/** Outcome of a decision function: the command may proceed, or it is rejected with a reason. */
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
