import type { AnnotationSummary, CreateAnnotationRequest } from '@api/index';
import type { Bbox, LonLat, MapFeature } from '@map/public-api';
import { ringGeometry } from '@shared/geo/geojson';

export type AnnotationKind = CreateAnnotationRequest['kind'];

export interface AnnotationFormValue {
  readonly title: string;
  readonly body: string;
}

/** Points needed before a draft can be saved: one for a pin, three for an area. */
export function isDraftReady(kind: AnnotationKind, points: readonly LonLat[]): boolean {
  return kind === 'OUTLINE' ? points.length >= 3 : points.length === 1;
}

/** Builds the request from the form and the clicked points. Call it only when the draft is ready. */
export function buildCreateRequest(
  kind: AnnotationKind,
  value: AnnotationFormValue,
  points: readonly LonLat[],
): CreateAnnotationRequest {
  const title = value.title.trim();
  if (kind === 'OUTLINE') {
    return { kind, title, geometry: ringGeometry(points) };
  }
  const [point] = points;
  const coordinates = point ? [point.longitude, point.latitude] : [];
  const geometry = { type: 'Point', coordinates } as const;
  return kind === 'NOTE'
    ? { kind, title, body: value.body.trim(), geometry }
    : { kind, title, geometry };
}

/** `west,south,east,north`, the format the list endpoint takes. */
export function bboxParam(box: Bbox): string {
  return [box.west, box.south, box.east, box.north].map(round).join(',');
}

const round = (value: number): number => Math.round(value * 1e6) / 1e6;

export function toMapFeature(annotation: AnnotationSummary): MapFeature {
  return {
    id: annotation.id,
    kind: annotation.kind,
    label: annotation.title,
    geometry: annotation.geometry,
  };
}

/** Where to look at an annotation: the pin, or the middle of the outline's bounding box. */
export function focusPoint(geometry: AnnotationSummary['geometry']): LonLat | null {
  if (geometry.type === 'Point') {
    const [longitude, latitude] = geometry.coordinates;
    return longitude === undefined || latitude === undefined ? null : { longitude, latitude };
  }
  const ring = geometry.coordinates[0] ?? [];
  const longitudes = ring.map((p) => p[0]).filter((n): n is number => n !== undefined);
  const latitudes = ring.map((p) => p[1]).filter((n): n is number => n !== undefined);
  if (longitudes.length === 0 || latitudes.length === 0) return null;
  return {
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}
