import { httpResource } from '@angular/common/http';
import { computed, linkedSignal, type Signal } from '@angular/core';
import { getAnnotationRequest, listAnnotationsRequest } from '@api/@angular/common.gen';
import {
  type AnnotationResponse,
  type AnnotationSummary,
  type CreateAnnotationRequest,
  type GetAnnotationResponse,
  type ListAnnotationsResponse,
  type UpdateAnnotationRequest,
  createAnnotation,
  updateAnnotation,
} from '@api/index';
import type { Bbox } from '@map/public-api';
import { type Outcome, asProblem, failed as failure, succeeded } from '@shared/problems/outcome';
import { bboxParam } from './annotation-draft';

const PAGE_SIZE = 200;

/**
 * The annotations of one scene inside the visible map area, loaded through the generated SDK.
 * Nothing loads until a scene is chosen and the map has reported its view. The caller passes the
 * signals it already has, so there is nothing to keep in sync: call it in an injection context.
 */
export function annotationData(
  activeSceneId: Signal<string | null>,
  visibleView: Signal<Bbox | null>,
  selectedAnnotationId: Signal<string | null>,
) {
  const page = httpResource<ListAnnotationsResponse>(() => {
    const sceneId = activeSceneId();
    const view = visibleView();
    if (!sceneId || !view) return undefined;
    return listAnnotationsRequest({
      path: { sceneId },
      query: { bbox: bboxParam(view), limit: PAGE_SIZE },
    });
  });

  /** Keeps showing the previous result while a new view loads, so the map does not flicker. */
  const items = linkedSignal<AnnotationSummary[] | undefined, AnnotationSummary[]>({
    source: () => (page.hasValue() ? page.value().items : undefined),
    computation: (next, previous) => next ?? previous?.value ?? [],
  });

  const truncated = computed(() => page.hasValue() && !!page.value().nextCursor);
  const loading = computed(() => page.isLoading());
  const failed = computed(() => page.error() !== undefined);

  const detail = httpResource<GetAnnotationResponse>(() => {
    const sceneId = activeSceneId();
    const id = selectedAnnotationId();
    if (!sceneId || !id) return undefined;
    return getAnnotationRequest({ path: { sceneId, id } });
  });

  const current = computed(() => (detail.hasValue() ? detail.value() : null));
  /** Its version. An update sends it back as If-Match, so it can never overwrite a newer one. */
  const etag = computed(() => detail.headers()?.get('ETag') ?? null);
  const detailLoading = computed(() => detail.isLoading());
  const detailFailed = computed(() => detail.error() !== undefined);

  function reload(): void {
    page.reload();
  }

  function reloadDetail(): void {
    detail.reload();
  }

  async function update(request: UpdateAnnotationRequest): Promise<Outcome<AnnotationResponse>> {
    const sceneId = activeSceneId();
    const id = selectedAnnotationId();
    const version = etag();
    if (!sceneId || !id || !version) {
      return failure({
        code: 'PRECONDITION_REQUIRED',
        title: 'A version is required',
        detail: 'The annotation has not finished loading.',
        status: 428,
      });
    }
    try {
      const result = await updateAnnotation({
        path: { sceneId, id },
        headers: { 'If-Match': version },
        body: request,
      });
      return result.data ? succeeded(result.data) : failure(asProblem(result.error));
    } catch {
      return failure(undefined);
    }
  }

  async function create(
    targetSceneId: string,
    request: CreateAnnotationRequest,
  ): Promise<Outcome<AnnotationResponse>> {
    try {
      const result = await createAnnotation({ path: { sceneId: targetSceneId }, body: request });
      return result.data ? succeeded(result.data) : failure(asProblem(result.error));
    } catch {
      return failure(undefined);
    }
  }

  return {
    items,
    truncated,
    loading,
    failed,
    current,
    etag,
    detailLoading,
    detailFailed,
    reload,
    reloadDetail,
    update,
    create,
  };
}

export type AnnotationData = ReturnType<typeof annotationData>;
