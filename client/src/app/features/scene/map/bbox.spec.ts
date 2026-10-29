import { describe, expect, it } from 'vitest';
import { bboxFromRadians, cameraPositionFromRadians } from './bbox';

describe('bboxFromRadians', () => {
  it.each([
    { name: 'origin', rect: [0, 0, 0, 0], expected: [0, 0, 0, 0] },
    {
      name: 'quarter turn',
      rect: [-Math.PI / 2, -Math.PI / 4, Math.PI / 2, Math.PI / 4],
      expected: [-90, -45, 90, 45],
    },
    {
      name: 'full world',
      rect: [-Math.PI, -Math.PI / 2, Math.PI, Math.PI / 2],
      expected: [-180, -90, 180, 90],
    },
  ])('converts $name to degrees', ({ rect, expected }) => {
    const [west, south, east, north] = rect as [number, number, number, number];
    const bbox = bboxFromRadians({ west, south, east, north });

    expect([bbox.west, bbox.south, bbox.east, bbox.north]).toEqual(
      expected.map((value) => expect.closeTo(value, 9)),
    );
  });

  it('clamps latitudes that drift past the poles', () => {
    const bbox = bboxFromRadians({ west: 0, south: -2, east: 1, north: 2 });

    expect(bbox.south).toBe(-90);
    expect(bbox.north).toBe(90);
  });

  it('keeps west greater than east when the view crosses the antimeridian', () => {
    const bbox = bboxFromRadians({ west: 3, south: 0, east: -3, north: 0.1 });

    expect(bbox.west).toBeGreaterThan(bbox.east);
  });
});

describe('cameraPositionFromRadians', () => {
  it('converts angles to degrees and keeps the height in metres', () => {
    const position = cameraPositionFromRadians({
      longitude: Math.PI / 2,
      latitude: -Math.PI / 6,
      height: 700,
    });

    expect(position.longitude).toBeCloseTo(90, 9);
    expect(position.latitude).toBeCloseTo(-30, 9);
    expect(position.height).toBe(700);
  });
});
