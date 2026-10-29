package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.CreateAnnotation;
import com.twinatlas.platform.kernel.Rejection;
import java.util.List;

/** What a batch will do: the annotations to create, and every element that was turned away. */
public record ImportPlan(List<Accepted> accepted, List<ItemRejection> rejected) {

  /** An element that passed every rule, with the command that creates its annotation. */
  public record Accepted(String reference, CreateAnnotation command) {}

  /** An element that did not pass, with the stable code of the first rule it failed. */
  public record ItemRejection(String reference, Rejection reason) {}
}
