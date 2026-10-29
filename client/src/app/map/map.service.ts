import { Service, signal } from '@angular/core';
import type { ScreenSpaceEventHandler, Viewer } from 'cesium';
import { type Bbox, type CameraPosition, bboxFromRadians, cameraPositionFromRadians } from './bbox';
import { debounce, type Debounced } from './debounce';
import { FeatureLayer } from './feature-layer';
import type { LonLat, MapClick, MapFeature } from './features';

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
  // Cesium renders at CSS pixels by default, which looks soft on any screen scaled above 100%.
  useBrowserRecommendedResolution: false,
};

/**
 * How coarse a 3D tile may look, in screen pixels of error. Cesium's default is 16, which keeps
 * the photorealistic tiles visibly soft; 8 loads the next level of detail sooner, at the price of
 * more tile requests.
 */
const TILE_SCREEN_SPACE_ERROR = 8;

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
  private readonly lastClickState = signal<MapClick | null>(null);
  private readonly epochState = signal(0);

  readonly cameraPosition = this.cameraPositionState.asReadonly();
  readonly visibleBbox = this.visibleBboxState.asReadonly();
  readonly mode = this.modeState.asReadonly();
  readonly tilesError = this.tilesErrorState.asReadonly();
  /** The latest click on the map. Each click is a new object, so effects re-run for every one. */
  readonly lastClick = this.lastClickState.asReadonly();
  /** Goes up each time a viewer is built. Read it in an effect to redraw after a rebuild. */
  readonly epoch = this.epochState.asReadonly();

  private cesium: CesiumModule | undefined;
  private viewer: Viewer | undefined;
  private removeCameraListener: (() => void) | undefined;
  private publishBbox: Debounced<[]> | undefined;
  private layer: FeatureLayer | undefined;
  private clickHandler: ScreenSpaceEventHandler | undefined;
  private clickSequence = 0;
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
        tileset.maximumScreenSpaceError = TILE_SCREEN_SPACE_ERROR;
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
    this.attachInteractions(Cesium, viewer);
    this.epochState.update((epoch) => epoch + 1);
  }

  flyTo(view: CameraPosition): void {
    const { viewer, cesium } = this;
    if (!viewer || !cesium) return;
    viewer.camera.flyTo({
      destination: cesium.Cartesian3.fromDegrees(view.longitude, view.latitude, view.height),
    });
  }

  setFeatures(features: readonly MapFeature[], selectedId: string | null): void {
    this.layer?.setFeatures(features, selectedId);
  }

  setDraft(points: readonly LonLat[], asArea: boolean): void {
    this.layer?.setDraft(points, asArea);
  }

  /** Releases the viewer, its tileset, layers and listeners. Safe to call at any time, more than once. */
  destroy(): void {
    this.generation++;
    this.clickHandler?.destroy();
    this.clickHandler = undefined;
    this.layer?.destroy();
    this.layer = undefined;
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
    this.lastClickState.set(null);
  }

  private attachInteractions(Cesium: CesiumModule, viewer: Viewer): void {
    this.layer = new FeatureLayer(
      Cesium,
      viewer,
      this.modeState() === 'photorealistic' ? 'tiles' : 'ground',
    );
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked: unknown = viewer.scene.pick(event.position);
      const entity =
        typeof picked === 'object' && picked !== null && 'id' in picked ? picked.id : null;
      const featureId = entity instanceof Cesium.Entity ? String(entity.id) : null;
      const position =
        (viewer.scene.pickPositionSupported
          ? viewer.scene.pickPosition(event.position)
          : undefined) ?? viewer.camera.pickEllipsoid(event.position, Cesium.Ellipsoid.WGS84);
      const cartographic = position ? Cesium.Cartographic.fromCartesian(position) : undefined;
      this.lastClickState.set({
        longitude: cartographic ? Cesium.Math.toDegrees(cartographic.longitude) : null,
        latitude: cartographic ? Cesium.Math.toDegrees(cartographic.latitude) : null,
        featureId,
        sequence: ++this.clickSequence,
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.clickHandler = handler;
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
