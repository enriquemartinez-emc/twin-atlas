import type { GeoJsonPolygon } from '@api/index';
import type { Bbox, LonLat } from '@map/public-api';

/** A closed ring: the first position is repeated at the end, as GeoJSON requires. */
export function ringGeometry(points: readonly LonLat[]): GeoJsonPolygon {
  const ring = points.map((p) => [p.longitude, p.latitude]);
  const first = ring[0];
  return { type: 'Polygon', coordinates: [first ? [...ring, first] : ring] };
}

/** The visible area as a polygon, for creating a scene that covers the current view. */
export function bboxPolygon(box: Bbox): GeoJsonPolygon {
  return ringGeometry([
    { longitude: box.west, latitude: box.south },
    { longitude: box.east, latitude: box.south },
    { longitude: box.east, latitude: box.north },
    { longitude: box.west, latitude: box.north },
  ]);
}
