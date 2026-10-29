package com.twinatlas.annotation;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record AnnotationPage(
    List<AnnotationSummary> items,
    @Schema(
            description = "Pass as `cursor` to get the next page. Null on the last page.",
            nullable = true)
        String nextCursor) {}
