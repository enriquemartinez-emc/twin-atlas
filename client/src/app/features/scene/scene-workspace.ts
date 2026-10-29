import { computed, inject, linkedSignal, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { annotationData } from './annotation/annotation-data';
import type { Bbox } from '@map/bbox';
import { SceneData } from './scene-data';

/** Which scene and annotation are chosen, and the annotations of the scene in view. */
export function sceneWorkspace(
  sceneId: Signal<string | undefined>,
  annotation: Signal<string | undefined>,
  view: Signal<Bbox | null>,
) {
  const router = inject(Router);
  const scenes = inject(SceneData);

  const selectedSceneId = computed(() => sceneId() ?? scenes.defaultId());
  /** Follows the URL, and takes the user's choice at once while the URL catches up. */
  const annotationId = linkedSignal<string | null>(() => annotation() ?? null);
  const data = annotationData(selectedSceneId, view, annotationId);

  /** The user's choice shows at once, and goes into the URL so the link can be shared. */
  function selectAnnotation(id: string | null): void {
    annotationId.set(id);
    void router.navigate([], {
      queryParams: { annotation: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  return { sceneId: selectedSceneId, annotationId, data, selectAnnotation };
}

export type SceneWorkspace = ReturnType<typeof sceneWorkspace>;
