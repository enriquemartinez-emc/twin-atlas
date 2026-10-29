import { computed, linkedSignal, signal, type Signal } from '@angular/core';
import { type AnnotationData } from '@features/scene/annotation/annotation-data';
import {
  type AnnotationFormValue,
  buildCreateRequest,
  isDraftReady,
} from '@features/scene/annotation/annotation-draft';
import { problemMessage } from '@app/core/problems/problem-message';
import type { LonLat } from '@map/feature.model';
import type { Tool } from './tool-rail';

/** What drawing needs from the rest of the page. */
export interface DrawingHost {
  readonly sceneId: Signal<string | null>;
  readonly annotationId: Signal<string | null>;
  readonly data: Pick<AnnotationData, 'create' | 'reload'>;
  selectAnnotation(id: string | null): void;
}

/** The tool in hand, the points clicked for something new, and saving it. */
export function drawingState(host: DrawingHost) {
  const tool = signal<Tool>('select');
  /** Cleared when the tool changes, and when another annotation is chosen in select mode. */
  const draft = linkedSignal<
    { readonly tool: Tool; readonly id: string | null },
    readonly LonLat[]
  >({
    source: () => ({ tool: tool(), id: host.annotationId() }),
    computation: (source, previous) =>
      source.tool === 'select' || previous?.source.tool !== source.tool
        ? []
        : (previous?.value ?? []),
  });
  const saving = signal(false);
  const problem = signal<string | null>(null);

  /** The kind being drawn, or null in select mode. */
  const formKind = computed(() => {
    const current = tool();
    return current === 'select' ? null : current;
  });
  const ready = computed(() => {
    const kind = formKind();
    return kind !== null && isDraftReady(kind, draft());
  });

  function selectTool(next: Tool): void {
    tool.set(next);
    draft.set([]);
    problem.set(null);
  }

  /** A pin or note keeps its latest point, an outline collects them. */
  function addPoint(point: LonLat): void {
    draft.update((points) => (tool() === 'OUTLINE' ? [...points, point] : [point]));
  }

  async function save(value: AnnotationFormValue): Promise<void> {
    const sceneId = host.sceneId();
    const kind = formKind();
    if (!sceneId || !kind || !ready()) return;

    saving.set(true);
    problem.set(null);
    const outcome = await host.data.create(sceneId, buildCreateRequest(kind, value, draft()));
    saving.set(false);

    if (outcome.ok) {
      host.data.reload();
      host.selectAnnotation(outcome.value.id);
      selectTool('select');
    } else {
      problem.set(problemMessage(outcome.problem));
    }
  }

  return { tool, draft, saving, problem, formKind, ready, selectTool, addPoint, save };
}

export type DrawingState = ReturnType<typeof drawingState>;
