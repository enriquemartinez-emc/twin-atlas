import { httpResource } from '@angular/common/http';
import { computed, linkedSignal, Service, signal } from '@angular/core';
import { listAnnotationsRequest } from '@api/@angular/common.gen';
import {
  type AnnotationResponse,
  type AnnotationSummary,
  type CreateAnnotationRequest,
  type ListAnnotationsResponse,
  createAnnotation,
} from '@api/index';
import type { Bbox } from '@map/public-api';
import { type Outcome, asProblem, failed, succeeded } from '@shared/problems/outcome';
import { bboxParam } from './draft';

const PAGE_SIZE = 200;

/**
 * The annotations of one scene inside the visible map area, loaded through the generated SDK.
 * Nothing loads until a scene is chosen and the map has reported its view.
 */
@Service()
export class AnnotationData {
  readonly sceneId = signal<string | null>(null);
  readonly view = signal<Bbox | null>(null);

  private readonly page = httpResource<ListAnnotationsResponse>(() => {
    const sceneId = this.sceneId();
    const view = this.view();
    if (!sceneId || !view) return undefined;
    return listAnnotationsRequest({
      path: { sceneId },
      query: { bbox: bboxParam(view), limit: PAGE_SIZE },
    });
  });

  /** Keeps showing the previous result while a new view loads, so the map does not flicker. */
  readonly items = linkedSignal<AnnotationSummary[] | undefined, AnnotationSummary[]>({
    source: () => (this.page.hasValue() ? this.page.value().items : undefined),
    computation: (next, previous) => next ?? previous?.value ?? [],
  });

  /** True when the view holds more annotations than one page: zoom in to see them all. */
  readonly truncated = computed(() => this.page.hasValue() && !!this.page.value().nextCursor);
  readonly loading = computed(() => this.page.isLoading());
  readonly failed = computed(() => this.page.error() !== undefined);

  reload(): void {
    this.page.reload();
  }

  async create(
    sceneId: string,
    request: CreateAnnotationRequest,
  ): Promise<Outcome<AnnotationResponse>> {
    try {
      const result = await createAnnotation({ path: { sceneId }, body: request });
      return result.data ? succeeded(result.data) : failed(asProblem(result.error));
    } catch {
      return failed(undefined);
    }
  }
}
