import type { GeoJsonPolygon } from '@api/index';
import type { Bbox } from './bbox';
import type { LonLat } from './feature.model';

/** A closed ring: the first position is repeated at the end, as GeoJSON requires. */
export function ringGeometry(points: readonly LonLat[]): GeoJsonPolygon {
  const ring = points.map((p) => [p.longitude, p.latitude]);
  const first = ring[0];
  return { type: 'Polygon', coordinates: [first ? [...ring, first] : ring] };
}

export function bboxPolygon(box: Bbox): GeoJsonPolygon {
  return ringGeometry([
    { longitude: box.west, latitude: box.south },
    { longitude: box.east, latitude: box.south },
    { longitude: box.east, latitude: box.north },
    { longitude: box.west, latitude: box.north },
  ]);
}
