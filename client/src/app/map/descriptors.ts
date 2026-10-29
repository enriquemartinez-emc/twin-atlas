import type { LonLat, MapFeature } from './features';
import { PALETTE } from './palette';

/**
 * How near the camera must be, in metres, for a point's label to be drawn. Farther away the labels
 * of a crowded view pile on top of each other. A first guess, to be tuned by eye. The selected
 * annotation is always labelled.
 */
export const LABEL_RANGE_METRES = 300;

export interface PointDescriptor {
  readonly shape: 'point';
  readonly id: string;
  readonly label: string;
  readonly labelRange: number | null;
  readonly longitude: number;
  readonly latitude: number;
  readonly color: string;
}

export interface PolygonDescriptor {
  readonly shape: 'polygon';
  readonly id: string;
  readonly label: string;
  readonly degrees: readonly number[];
  readonly color: string;
}

export type FeatureDescriptor = PointDescriptor | PolygonDescriptor;

export function ringToDegrees(ring: readonly (readonly number[])[]): number[] {
  const positions = ring.filter((p) => p.length >= 2);
  const first = positions[0];
  const last = positions[positions.length - 1];
  const closed =
    positions.length > 1 && first && last && first[0] === last[0] && first[1] === last[1];
  return (closed ? positions.slice(0, -1) : positions).flatMap((p) => [p[0] ?? 0, p[1] ?? 0]);
}

/** Turns a feature into plain drawing data. Cesium objects are built from this, nowhere else. */
export function describeFeature(
  feature: MapFeature,
  selectedId: string | null,
): FeatureDescriptor | null {
  const color = feature.id === selectedId ? PALETTE.SELECTED : PALETTE[feature.kind];
  const { geometry } = feature;
  if (geometry.type === 'Point') {
    const [longitude, latitude] = geometry.coordinates;
    if (longitude === undefined || latitude === undefined) return null;
    const labelRange = feature.id === selectedId ? null : LABEL_RANGE_METRES;
    return {
      shape: 'point',
      id: feature.id,
      label: feature.label,
      labelRange,
      longitude,
      latitude,
      color,
    };
  }
  const ring = geometry.coordinates[0];
  if (!ring) return null;
  const degrees = ringToDegrees(ring);
  if (degrees.length < 6) return null; // fewer than three vertices is not an area
  return { shape: 'polygon', id: feature.id, label: feature.label, degrees, color };
}

export function describeDraft(
  points: readonly LonLat[],
  asArea: boolean,
): {
  readonly points: readonly LonLat[];
  readonly degrees: readonly number[];
  readonly area: boolean;
} {
  return {
    points,
    degrees: points.flatMap((p) => [p.longitude, p.latitude]),
    area: asArea && points.length >= 3,
  };
}
