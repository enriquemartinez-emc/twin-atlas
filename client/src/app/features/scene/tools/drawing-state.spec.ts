import { signal } from '@angular/core';
import type { AnnotationResponse } from '@api/index';
import { failed, succeeded } from '@app/core/problems/outcome.model';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type DrawingHost, drawingState } from './drawing-state';

const created = {
  id: 'new',
  sceneId: 's1',
  kind: 'MARKER',
  title: 'Cracked window',
  body: null,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point', coordinates: [2.175, 41.405] },
} satisfies AnnotationResponse;

describe('drawingState', () => {
  const create = vi.fn<DrawingHost['data']['create']>();
  const reload = vi.fn();
  const selectAnnotation = vi.fn();
  const annotationId = signal<string | null>(null);
  const point = { longitude: 2.175, latitude: 41.405 };

  const drawing = () =>
    drawingState({
      sceneId: signal<string | null>('s1'),
      annotationId,
      data: { create, reload },
      selectAnnotation,
    });

  beforeEach(() => {
    vi.resetAllMocks();
    annotationId.set(null);
  });

  it('starts in select mode with nothing drawn', () => {
    const state = drawing();

    expect(state.tool()).toBe('select');
    expect(state.formKind()).toBeNull();
    expect(state.draft()).toEqual([]);
  });

  it('keeps the latest point of a marker and collects the points of an outline', () => {
    const state = drawing();
    state.selectTool('MARKER');
    state.addPoint(point);
    state.addPoint({ longitude: 3, latitude: 4 });
    expect(state.draft()).toEqual([{ longitude: 3, latitude: 4 }]);

    state.selectTool('OUTLINE');
    state.addPoint(point);
    state.addPoint({ longitude: 3, latitude: 4 });
    expect(state.draft()).toHaveLength(2);
  });

  it('is ready with one point for a marker and three for an outline', () => {
    const state = drawing();
    state.selectTool('MARKER');
    expect(state.ready()).toBe(false);
    state.addPoint(point);
    expect(state.ready()).toBe(true);

    state.selectTool('OUTLINE');
    state.addPoint(point);
    state.addPoint(point);
    expect(state.ready()).toBe(false);
    state.addPoint(point);
    expect(state.ready()).toBe(true);
  });

  it('clears the points and the problem when another tool is chosen', () => {
    const state = drawing();
    state.selectTool('MARKER');
    state.addPoint(point);
    state.problem.set('Taken');

    state.selectTool('NOTE');

    expect(state.draft()).toEqual([]);
    expect(state.problem()).toBeNull();
  });

  it('does not keep a preview in select mode when another annotation is chosen', () => {
    const state = drawing();
    state.draft.set([point]);
    expect(state.draft()).toEqual([point]);

    annotationId.set('a2');

    expect(state.draft()).toEqual([]);
  });

  it('saves a ready draft, reloads, selects what was made and goes back to select', async () => {
    create.mockResolvedValue(succeeded(created));
    const state = drawing();
    state.selectTool('MARKER');
    state.addPoint(point);

    await state.save({ title: 'Cracked window', body: '' });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0]).toBe('s1');
    expect(reload).toHaveBeenCalledOnce();
    expect(selectAnnotation).toHaveBeenCalledWith('new');
    expect(state.tool()).toBe('select');
    expect(state.saving()).toBe(false);
  });

  it('does nothing until the draft is ready', async () => {
    const state = drawing();
    state.selectTool('MARKER');

    await state.save({ title: 'Cracked window', body: '' });

    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the draft and says what went wrong when the save is refused', async () => {
    create.mockResolvedValue(
      failed({ code: 'TITLE_ALREADY_USED', title: 'Title already used', detail: 'Taken.' }),
    );
    const state = drawing();
    state.selectTool('MARKER');
    state.addPoint(point);

    await state.save({ title: 'Cracked window', body: '' });

    expect(state.tool()).toBe('MARKER');
    expect(state.draft()).toEqual([point]);
    expect(state.problem()).toContain('title');
    expect(selectAnnotation).not.toHaveBeenCalled();
  });
});
