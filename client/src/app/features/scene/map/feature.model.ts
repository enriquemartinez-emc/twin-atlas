/**
 * What the map is asked to draw. Cesium-free and independent of the API types, but structurally
 * compatible with the generated GeoJSON types, so callers can pass SDK data straight in.
 */
type MapGeometry =
  | { readonly type: 'Point'; readonly coordinates: readonly number[] }
  | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly (readonly number[])[])[] };

type MapFeatureKind = 'MARKER' | 'NOTE' | 'OUTLINE';

export interface MapFeature {
  readonly id: string;
  readonly kind: MapFeatureKind;
  readonly label: string;
  readonly geometry: MapGeometry;
}

export interface LonLat {
  readonly longitude: number;
  readonly latitude: number;
}

export interface MapClick {
  readonly longitude: number | null;
  readonly latitude: number | null;
  readonly featureId: string | null;
  /** Changes on every click, so two clicks at the same spot are still two events. */
  readonly sequence: number;
}
