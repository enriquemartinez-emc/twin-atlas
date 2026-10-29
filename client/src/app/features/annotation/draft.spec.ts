import type { AnnotationSummary } from '@api/index';
import { describe, expect, it } from 'vitest';
import {
  bboxParam,
  buildCreateRequest,
  buildUpdateRequest,
  focusPoint,
  isDraftReady,
  toMapFeature,
} from './draft';

const a = { longitude: 2.17, latitude: 41.4 };
const b = { longitude: 2.18, latitude: 41.4 };
const c = { longitude: 2.18, latitude: 41.41 };

describe('isDraftReady', () => {
  it.each([
    ['MARKER', [], false],
    ['MARKER', [a], true],
    ['MARKER', [a, b], false],
    ['NOTE', [a], true],
    ['NOTE', [a, b], false],
    ['OUTLINE', [a, b], false],
    ['OUTLINE', [a, b, c], true],
    ['OUTLINE', [a, b, c, a], true],
  ] as const)('%s with %j points → %s', (kind, points, expected) => {
    expect(isDraftReady(kind, points)).toBe(expected);
  });
});

describe('buildCreateRequest', () => {
  const value = { title: '  Cracked window ', body: ' Water stain ' };

  it('builds a marker without text', () => {
    expect(buildCreateRequest('MARKER', value, [a])).toEqual({
      kind: 'MARKER',
      title: 'Cracked window',
      geometry: { type: 'Point', coordinates: [2.17, 41.4] },
    });
  });

  it('builds a note with trimmed text', () => {
    expect(buildCreateRequest('NOTE', value, [a])).toEqual({
      kind: 'NOTE',
      title: 'Cracked window',
      body: 'Water stain',
      geometry: { type: 'Point', coordinates: [2.17, 41.4] },
    });
  });

  it('builds an outline with a closed ring and no text', () => {
    const request = buildCreateRequest('OUTLINE', value, [a, b, c]);

    expect(request).toEqual({
      kind: 'OUTLINE',
      title: 'Cracked window',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [2.17, 41.4],
            [2.18, 41.4],
            [2.18, 41.41],
            [2.17, 41.4],
          ],
        ],
      },
    });
    expect('body' in request).toBe(false);
  });
});

describe('bboxParam', () => {
  it('formats west,south,east,north and trims float noise', () => {
    expect(bboxParam({ west: 2.1700000001, south: 41.4, east: 2.18, north: 41.41 })).toBe(
      '2.17,41.4,2.18,41.41',
    );
  });
});

describe('toMapFeature and focusPoint', () => {
  const summary = (geometry: AnnotationSummary['geometry']): AnnotationSummary => ({
    id: 'id-1',
    sceneId: 's',
    kind: 'NOTE',
    title: 'Leak',
    body: 'text',
    status: 'DRAFT',
    createdAt: '2026-01-01T00:00:00Z',
    geometry,
  });

  it('maps an annotation to what the map draws', () => {
    const geometry: AnnotationSummary['geometry'] = { type: 'Point', coordinates: [1, 2] };

    expect(toMapFeature(summary(geometry))).toEqual({
      id: 'id-1',
      kind: 'NOTE',
      label: 'Leak',
      geometry,
    });
  });

  it('focuses a pin on itself and an outline on the middle of its box', () => {
    expect(focusPoint({ type: 'Point', coordinates: [1, 2] })).toEqual({
      longitude: 1,
      latitude: 2,
    });
    expect(
      focusPoint({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [4, 0],
            [4, 2],
            [0, 0],
          ],
        ],
      }),
    ).toEqual({ longitude: 2, latitude: 1 });
  });

  it('has no focus for empty geometry', () => {
    expect(focusPoint({ type: 'Point', coordinates: [] })).toBeNull();
    expect(focusPoint({ type: 'Polygon', coordinates: [] })).toBeNull();
  });
});

describe('buildUpdateRequest', () => {
  const marker = {
    id: 'a',
    sceneId: 's',
    kind: 'MARKER' as const,
    title: 'Cracked window',
    body: null,
    status: 'DRAFT' as const,
    createdAt: '2026-01-01T00:00:00Z',
    geometry: { type: 'Point' as const, coordinates: [2.175, 41.405] },
  };
  const note = { ...marker, kind: 'NOTE' as const, title: 'Leak', body: 'wet' };
  const outline = {
    ...marker,
    kind: 'OUTLINE' as const,
    title: 'Area',
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
  };
  const target = { longitude: 2.172, latitude: 41.402 };

  it('is null when nothing changed, ignoring surrounding spaces', () => {
    expect(buildUpdateRequest(marker, { title: ' Cracked window ', body: '' }, null)).toBeNull();
    expect(buildUpdateRequest(note, { title: 'Leak', body: ' wet ' }, null)).toBeNull();
  });

  it('sends only the title when only the title changed', () => {
    expect(buildUpdateRequest(marker, { title: ' Loose tile ', body: '' }, null)).toEqual({
      title: 'Loose tile',
    });
  });

  it('treats a change of letter case as a change', () => {
    expect(buildUpdateRequest(marker, { title: 'cracked window', body: '' }, null)).toEqual({
      title: 'cracked window',
    });
  });

  it('sends the text of a note only when it changed, and never for other kinds', () => {
    expect(buildUpdateRequest(note, { title: 'Leak', body: 'dry' }, null)).toEqual({ body: 'dry' });
    expect(
      buildUpdateRequest(marker, { title: 'Cracked window', body: 'stray text' }, null),
    ).toBeNull();
    expect(buildUpdateRequest(outline, { title: 'Area', body: 'stray text' }, null)).toBeNull();
  });

  it('sends the new position as a point when the pin was moved', () => {
    expect(buildUpdateRequest(marker, { title: 'Cracked window', body: '' }, target)).toEqual({
      geometry: { type: 'Point', coordinates: [2.172, 41.402] },
    });
  });

  it('combines every change in one request', () => {
    expect(buildUpdateRequest(note, { title: 'Drip', body: 'dry' }, target)).toEqual({
      title: 'Drip',
      body: 'dry',
      geometry: { type: 'Point', coordinates: [2.172, 41.402] },
    });
  });
});
