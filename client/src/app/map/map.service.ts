import { Service, signal } from '@angular/core';
import type { Viewer } from 'cesium';
import { type Bbox, type CameraPosition, bboxFromRadians, cameraPositionFromRadians } from './bbox';
import { debounce, type Debounced } from './debounce';

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

export type MapMode = 'photorealistic' | 'osm';

export interface MapInitOptions {
  /** Cesium ion access token. Without it the globe falls back to OpenStreetMap imagery. */
  readonly ionToken: string | null;
  readonly initialView: CameraPosition;
}

const loadCesium = () => import('cesium');
type CesiumModule = Awaited<ReturnType<typeof loadCesium>>;

const WIDGETS_OFF: Viewer.ConstructorOptions = {
  animation: false,
  timeline: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  infoBox: false,
  selectionIndicator: false,
};

const BBOX_DEBOUNCE_MS = 250;
const WIDGETS_CSS_ID = 'cesium-widgets-css';
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * The only place that touches the Cesium API. Cesium itself is loaded with a dynamic import, so it
 * lands in its own lazy chunk. Every Cesium object created here is released in `destroy()`.
 */
@Service()
export class MapService {
  private readonly cameraPositionState = signal<CameraPosition | null>(null);
  private readonly visibleBboxState = signal<Bbox | null>(null);
  private readonly modeState = signal<MapMode | null>(null);
  private readonly tilesErrorState = signal<string | null>(null);

  readonly cameraPosition = this.cameraPositionState.asReadonly();
  /** Debounced: updates {@link BBOX_DEBOUNCE_MS} ms after the camera stops changing. */
  readonly visibleBbox = this.visibleBboxState.asReadonly();
  readonly mode = this.modeState.asReadonly();
  /** Set when photorealistic tiles failed to load (usually a rejected token) and OSM is shown instead. */
  readonly tilesError = this.tilesErrorState.asReadonly();

  private cesium: CesiumModule | undefined;
  private viewer: Viewer | undefined;
  private removeCameraListener: (() => void) | undefined;
  private publishBbox: Debounced<[]> | undefined;
  private generation = 0;

  async init(container: HTMLElement, options: MapInitOptions): Promise<void> {
    this.destroy();
    const generation = ++this.generation;

    window.CESIUM_BASE_URL = new URL('assets/cesium/', document.baseURI).href;
    this.attachWidgetsCss();
    const Cesium = await loadCesium();
    // destroy() or a newer init() ran while Cesium was loading
    if (generation !== this.generation) return;
    this.cesium = Cesium;

    const { ionToken, initialView } = options;
    let viewer: Viewer;
    if (ionToken) {
      Cesium.Ion.defaultAccessToken = ionToken;
      viewer = new Cesium.Viewer(container, { ...WIDGETS_OFF, baseLayer: false, globe: false });
      this.viewer = viewer;
      try {
        // We have no geocoder at all (geocoder: false), which satisfies Google's terms.
        const tileset = await Cesium.createGooglePhotorealistic3DTileset({
          onlyUsingWithGoogleGeocoder: true,
        });
        if (generation !== this.generation) return;
        viewer.scene.primitives.add(tileset);
        this.modeState.set('photorealistic');
      } catch (error) {
        // Invalid token or no access to the asset: fall back so the user still gets a globe.
        if (generation !== this.generation) return;
        this.tilesErrorState.set(error instanceof Error ? error.message : 'Unknown error');
        viewer.destroy();
        viewer = this.createOsmViewer(Cesium, container);
        this.viewer = viewer;
        this.modeState.set('osm');
      }
    } else {
      viewer = this.createOsmViewer(Cesium, container);
      this.viewer = viewer;
      this.modeState.set('osm');
    }

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        initialView.longitude,
        initialView.latitude,
        initialView.height,
      ),
    });
    viewer.camera.percentageChanged = 0.01;

    const camera = viewer.camera;
    this.publishBbox = debounce(() => {
      const rectangle = camera.computeViewRectangle();
      this.visibleBboxState.set(rectangle ? bboxFromRadians(rectangle) : null);
    }, BBOX_DEBOUNCE_MS);
    const publishBbox = this.publishBbox;
    const onCameraChanged = (): void => {
      this.cameraPositionState.set(cameraPositionFromRadians(camera.positionCartographic));
      publishBbox();
    };
    this.removeCameraListener = camera.changed.addEventListener(onCameraChanged);
    onCameraChanged();
  }

  flyTo(view: CameraPosition): void {
    const { viewer, cesium } = this;
    if (!viewer || !cesium) return;
    viewer.camera.flyTo({
      destination: cesium.Cartesian3.fromDegrees(view.longitude, view.latitude, view.height),
    });
  }

  /** Releases the viewer, its tileset and listeners. Safe to call at any time, more than once. */
  destroy(): void {
    this.generation++;
    this.publishBbox?.cancel();
    this.publishBbox = undefined;
    this.removeCameraListener?.();
    this.removeCameraListener = undefined;
    if (this.viewer && !this.viewer.isDestroyed()) this.viewer.destroy();
    this.viewer = undefined;
    this.cesium = undefined;
    document.getElementById(WIDGETS_CSS_ID)?.remove();
    this.cameraPositionState.set(null);
    this.visibleBboxState.set(null);
    this.modeState.set(null);
    this.tilesErrorState.set(null);
  }

  private createOsmViewer(Cesium: CesiumModule, container: HTMLElement): Viewer {
    const imagery = new Cesium.UrlTemplateImageryProvider({
      url: OSM_TILE_URL,
      maximumLevel: 19,
      credit: '© OpenStreetMap contributors',
    });
    return new Cesium.Viewer(container, {
      ...WIDGETS_OFF,
      baseLayer: new Cesium.ImageryLayer(imagery),
    });
  }

  private attachWidgetsCss(): void {
    if (document.getElementById(WIDGETS_CSS_ID)) return;
    const link = document.createElement('link');
    link.id = WIDGETS_CSS_ID;
    link.rel = 'stylesheet';
    link.href = new URL('assets/cesium/Widgets/widgets.css', document.baseURI).href;
    document.head.append(link);
  }
}
