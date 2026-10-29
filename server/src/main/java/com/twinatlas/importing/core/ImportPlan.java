package com.twinatlas.importing.core;

import com.twinatlas.annotation.core.CreateAnnotation;
import com.twinatlas.platform.kernel.Rejection;
import java.util.List;

public record ImportPlan(List<Accepted> accepted, List<ItemRejection> rejected) {

  public record Accepted(String reference, CreateAnnotation command) {}

  public record ItemRejection(String reference, Rejection reason) {}
}
