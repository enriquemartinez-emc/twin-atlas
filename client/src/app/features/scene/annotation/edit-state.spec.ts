import { signal } from '@angular/core';
import type { AnnotationResponse } from '@api/index';
import { failed, succeeded } from '@app/core/problems/outcome.model';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type EditHost, editState } from './edit-state';

const marker = {
  id: 'a1',
  sceneId: 's1',
  kind: 'MARKER',
  title: 'Cracked window',
  body: null,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point', coordinates: [2.175, 41.405] },
} satisfies AnnotationResponse;

describe('editState', () => {
  const update = vi.fn<EditHost['data']['update']>();
  const reload = vi.fn();
  const reloadDetail = vi.fn();
  const selectAnnotation = vi.fn();
  const annotationId = signal<string | null>('a1');
  const current = signal<AnnotationResponse | null>(marker);
  const tool = signal<'select' | 'MARKER'>('select');
  const draft = signal<readonly { longitude: number; latitude: number }[]>([]);
  const spot = { longitude: 3, latitude: 4 };

  const state = () =>
    editState(
      { annotationId, data: { current, update, reload, reloadDetail }, selectAnnotation },
      { tool, draft },
    );

  beforeEach(() => {
    vi.resetAllMocks();
    annotationId.set('a1');
    current.set(marker);
    tool.set('select');
    draft.set([]);
  });

  it('shows the annotation for editing in select mode only', () => {
    const edit = state();
    expect(edit.annotation()).toEqual(marker);

    tool.set('MARKER');

    expect(edit.annotation()).toBeNull();
  });

  it('waits for a click when a move is asked for, and takes the clicked spot', () => {
    const edit = state();
    edit.start();
    expect(edit.moving()).toBe(true);

    edit.chooseSpot(spot);

    expect(edit.moving()).toBe(false);
    expect(edit.movedTo()).toEqual(spot);
    expect(draft()).toEqual([spot]);
  });

  it('cancelling a move drops the chosen spot and its preview', () => {
    const edit = state();
    edit.chooseSpot(spot);

    edit.cancelMove();

    expect(edit.movedTo()).toBeNull();
    expect(draft()).toEqual([]);
  });

  it('starts half-finished edits afresh when another annotation is chosen', () => {
    const edit = state();
    edit.start();
    edit.problem.set('Taken');

    annotationId.set('a2');

    expect(edit.moving()).toBe(false);
    expect(edit.movedTo()).toBeNull();
    expect(edit.problem()).toBeNull();
    expect(edit.stale()).toBe(false);
  });

  it('closing clears the chosen annotation', () => {
    state().close();

    expect(selectAnnotation).toHaveBeenCalledWith(null);
  });

  it('saves a change, reloads the list and the annotation, and clears the edit', async () => {
    update.mockResolvedValue(succeeded({ ...marker, title: 'Leak' }));
    const edit = state();
    edit.chooseSpot(spot);

    await edit.save({ title: 'Leak', body: '' });

    expect(update).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(reloadDetail).toHaveBeenCalledOnce();
    expect(edit.movedTo()).toBeNull();
    expect(edit.updating()).toBe(false);
  });

  it('does not call the server when nothing changed', async () => {
    await state().save({ title: 'Cracked window', body: '' });

    expect(update).not.toHaveBeenCalled();
  });

  it('marks a refused save as stale when someone else changed the annotation', async () => {
    update.mockResolvedValue(
      failed({ code: 'STALE_VERSION', title: 'Annotation changed', detail: 'Reload.' }),
    );
    const edit = state();

    await edit.save({ title: 'Leak', body: '' });

    expect(edit.stale()).toBe(true);
    expect(edit.problem()).not.toBeNull();
  });

  it('does not mark another refusal as stale', async () => {
    update.mockResolvedValue(
      failed({ code: 'TITLE_ALREADY_USED', title: 'Title already used', detail: 'Taken.' }),
    );
    const edit = state();

    await edit.save({ title: 'Leak', body: '' });

    expect(edit.stale()).toBe(false);
    expect(edit.problem()).not.toBeNull();
  });

  it('loads the latest version after a conflict and drops the edits', () => {
    const edit = state();
    edit.chooseSpot(spot);
    edit.stale.set(true);

    edit.loadLatest();

    expect(edit.stale()).toBe(false);
    expect(edit.movedTo()).toBeNull();
    expect(reloadDetail).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });
});
