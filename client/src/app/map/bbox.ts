/** Geographic bounding box in degrees (EPSG:4326). `west > east` means it crosses the antimeridian. */
export interface Bbox {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export interface CameraPosition {
  readonly longitude: number;
  readonly latitude: number;
  readonly height: number;
}

/** Structural shape of Cesium's `Rectangle` and `Cartographic` (radians), so this file stays Cesium-free. */
export interface RadianRectangle {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export interface RadianCartographic {
  readonly longitude: number;
  readonly latitude: number;
  readonly height: number;
}

const DEGREES_PER_RADIAN = 180 / Math.PI;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function bboxFromRadians(rectangle: RadianRectangle): Bbox {
  return {
    west: rectangle.west * DEGREES_PER_RADIAN,
    south: clamp(rectangle.south * DEGREES_PER_RADIAN, -90, 90),
    east: rectangle.east * DEGREES_PER_RADIAN,
    north: clamp(rectangle.north * DEGREES_PER_RADIAN, -90, 90),
  };
}

export function cameraPositionFromRadians(cartographic: RadianCartographic): CameraPosition {
  return {
    longitude: cartographic.longitude * DEGREES_PER_RADIAN,
    latitude: cartographic.latitude * DEGREES_PER_RADIAN,
    height: cartographic.height,
  };
}
