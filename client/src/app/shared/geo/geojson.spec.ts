import { describe, expect, it } from 'vitest';
import { bboxPolygon, ringGeometry } from './geojson';

const a = { longitude: 2.17, latitude: 41.4 };
const b = { longitude: 2.18, latitude: 41.4 };
const c = { longitude: 2.18, latitude: 41.41 };

describe('ringGeometry and bboxPolygon', () => {
  it('closes the ring by repeating the first position', () => {
    const ring = ringGeometry([a, b, c]).coordinates[0] ?? [];

    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[3]);
  });

  it('turns a bbox into a rectangle', () => {
    const polygon = bboxPolygon({ west: 1, south: 2, east: 3, north: 4 });

    expect(polygon.coordinates[0]).toEqual([
      [1, 2],
      [3, 2],
      [3, 4],
      [1, 4],
      [1, 2],
    ]);
  });
});
