import { describe, expect, it } from 'vitest';
import { LABEL_RANGE_METRES, describeDraft, describeFeature, ringToDegrees } from './descriptors';
import type { MapFeature } from './features';
import { PALETTE } from './palette';

const ring = [
  [2.17, 41.4],
  [2.18, 41.4],
  [2.18, 41.41],
  [2.17, 41.4],
];

describe('ringToDegrees', () => {
  it('flattens positions and drops the closing duplicate', () => {
    expect(ringToDegrees(ring)).toEqual([2.17, 41.4, 2.18, 41.4, 2.18, 41.41]);
  });

  it('keeps an open ring as it is', () => {
    expect(
      ringToDegrees([
        [0, 0],
        [1, 0],
        [1, 1],
      ]),
    ).toEqual([0, 0, 1, 0, 1, 1]);
  });

  it('ignores the height of a position', () => {
    expect(ringToDegrees([[1, 2, 99]])).toEqual([1, 2]);
  });

  it('handles an empty ring', () => {
    expect(ringToDegrees([])).toEqual([]);
  });
});

describe('describeFeature', () => {
  const marker: MapFeature = {
    id: 'a',
    kind: 'MARKER',
    label: 'Cracked window',
    geometry: { type: 'Point', coordinates: [2.175, 41.405] },
  };

  it('describes a point with the colour of its kind', () => {
    expect(describeFeature(marker, null)).toEqual({
      shape: 'point',
      id: 'a',
      label: 'Cracked window',
      labelRange: LABEL_RANGE_METRES,
      longitude: 2.175,
      latitude: 41.405,
      color: PALETTE.MARKER,
    });
  });

  it('labels a point only when the camera is near, and always for the selected one', () => {
    expect(describeFeature(marker, null)).toMatchObject({ labelRange: LABEL_RANGE_METRES });
    expect(describeFeature(marker, 'other')).toMatchObject({ labelRange: LABEL_RANGE_METRES });
    expect(describeFeature(marker, 'a')).toMatchObject({ labelRange: null });
  });

  it('uses the note colour for notes and the selection colour for the selected feature', () => {
    const note: MapFeature = { ...marker, id: 'n', kind: 'NOTE' };

    expect(describeFeature(note, null)?.color).toBe(PALETTE.NOTE);
    expect(describeFeature(note, 'n')?.color).toBe(PALETTE.SELECTED);
    expect(describeFeature(marker, 'n')?.color).toBe(PALETTE.MARKER);
  });

  it('describes an outline by its outer ring', () => {
    const outline: MapFeature = {
      id: 'o',
      kind: 'OUTLINE',
      label: 'Inspection area',
      geometry: { type: 'Polygon', coordinates: [ring] },
    };

    expect(describeFeature(outline, null)).toMatchObject({
      shape: 'polygon',
      degrees: [2.17, 41.4, 2.18, 41.4, 2.18, 41.41],
      color: PALETTE.OUTLINE,
    });
  });

  it.each([
    ['a point without coordinates', { type: 'Point', coordinates: [] }],
    ['a polygon without rings', { type: 'Polygon', coordinates: [] }],
    [
      'a polygon with fewer than three vertices',
      {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    ],
  ] as const)('skips %s', (_name, geometry) => {
    expect(describeFeature({ ...marker, geometry }, null)).toBeNull();
  });
});

describe('describeDraft', () => {
  const points = [
    { longitude: 1, latitude: 2 },
    { longitude: 3, latitude: 4 },
    { longitude: 5, latitude: 6 },
  ];

  it('flattens the points and fills an area only once there are three', () => {
    expect(describeDraft(points, true)).toMatchObject({ degrees: [1, 2, 3, 4, 5, 6], area: true });
    expect(describeDraft(points.slice(0, 2), true).area).toBe(false);
    expect(describeDraft(points, false).area).toBe(false);
  });
});
