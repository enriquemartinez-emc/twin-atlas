package com.twinatlas.importing;

import com.twinatlas.platform.core.Rejection;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** What the import did. Every element is accounted for: imported plus rejected equals received. */
public record OsmImportResponse(
    @Schema(description = "Elements in the request") int received,
    @Schema(description = "Annotations created, as drafts") int imported,
    @Schema(description = "Every element that was not imported, with the reason")
        List<ItemRejection> rejected) {

  public record ItemRejection(
      @Schema(description = "The element, for example node/123 or way/456") String reference,
      @Schema(description = "Stable code of the rule the element failed") Rejection code) {}
}
