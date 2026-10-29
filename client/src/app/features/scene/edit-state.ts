import { computed, linkedSignal, signal, type Signal } from '@angular/core';
import {
  type AnnotationData,
  type AnnotationFormValue,
  buildUpdateRequest,
} from '@features/annotation';
import { problemMessage } from '@app/core/problems/problem-message';
import type { LonLat } from '@map';
import type { DrawingState } from './drawing-state';

/** What editing needs from the rest of the page. */
export interface EditHost {
  readonly annotationId: Signal<string | null>;
  readonly data: Pick<AnnotationData, 'current' | 'update' | 'reload' | 'reloadDetail'>;
  selectAnnotation(id: string | null): void;
}

/** Changes to the chosen annotation that are not saved yet, and saving them. */
export function editState(host: EditHost, drawing: Pick<DrawingState, 'tool' | 'draft'>) {
  // Half-finished edits belong to one annotation: choosing another one starts them afresh.
  const moving = linkedSignal(() => {
    host.annotationId();
    return false;
  });
  const movedTo = linkedSignal<LonLat | null>(() => {
    host.annotationId();
    return null;
  });
  const problem = linkedSignal<string | null>(() => {
    host.annotationId();
    return null;
  });
  const stale = linkedSignal(() => {
    host.annotationId();
    return false;
  });
  const updating = signal(false);

  /** The chosen annotation, shown for editing in select mode once the server has returned it. */
  const annotation = computed(() => (drawing.tool() === 'select' ? host.data.current() : null));

  function start(): void {
    moving.set(true);
    movedTo.set(null);
    drawing.draft.set([]);
  }

  function cancelMove(): void {
    moving.set(false);
    movedTo.set(null);
    drawing.draft.set([]);
  }

  /** The map was clicked while a new position was awaited. */
  function chooseSpot(point: LonLat): void {
    movedTo.set(point);
    drawing.draft.set([point]);
    moving.set(false);
  }

  function reset(): void {
    moving.set(false);
    movedTo.set(null);
    problem.set(null);
    stale.set(false);
    if (drawing.tool() === 'select') drawing.draft.set([]);
  }

  /** After a conflict: drop the edits and read the annotation again, with its new version. */
  function loadLatest(): void {
    reset();
    host.data.reloadDetail();
    host.data.reload();
  }

  function close(): void {
    host.selectAnnotation(null);
  }

  async function save(value: AnnotationFormValue): Promise<void> {
    const current = host.data.current();
    if (!current) return;
    const request = buildUpdateRequest(current, value, movedTo());
    if (!request) return;

    updating.set(true);
    problem.set(null);
    stale.set(false);
    const outcome = await host.data.update(request);
    updating.set(false);

    if (outcome.ok) {
      host.data.reload();
      host.data.reloadDetail();
      reset();
      return;
    }
    problem.set(problemMessage(outcome.problem));
    const code = outcome.problem?.code;
    stale.set(code === 'STALE_VERSION' || code === 'CONCURRENT_MODIFICATION');
  }

  return {
    annotation,
    moving,
    movedTo,
    problem,
    stale,
    updating,
    start,
    cancelMove,
    chooseSpot,
    loadLatest,
    close,
    save,
  };
}

export type EditState = ReturnType<typeof editState>;
