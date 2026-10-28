// Public entry point of the Cesium wrapper. Components never import `cesium` directly.
// Load the service lazily with `injectAsync(() => import('@map/map.service')...)` and use
// `import type` from here for its types.
export type { Bbox, CameraPosition } from './bbox';
export { MapService } from './map.service';
export type { MapInitOptions, MapMode } from './map.service';
