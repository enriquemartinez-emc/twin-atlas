import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapService } from './map.service';

const cesium = vi.hoisted(() => {
  type Listener = () => void;

  class FakeViewer {
    destroyed = false;
    readonly listeners = new Set<Listener>();
    readonly camera = {
      percentageChanged: 0,
      positionCartographic: { longitude: Math.PI / 2, latitude: Math.PI / 4, height: 700 },
      setView: vi.fn(),
      flyTo: vi.fn(),
      computeViewRectangle: vi.fn(() => ({
        west: 0,
        south: 0,
        east: Math.PI / 2,
        north: Math.PI / 4,
      })),
      changed: {
        addEventListener: (listener: Listener) => {
          this.listeners.add(listener);
          return () => this.listeners.delete(listener);
        },
      },
    };
    readonly scene = { primitives: { add: vi.fn() } };

    constructor(
      readonly container: HTMLElement,
      readonly options: Record<string, unknown>,
    ) {
      state.viewers.push(this);
    }

    destroy(): void {
      this.destroyed = true;
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }
  }

  const state = { viewers: [] as FakeViewer[], tilesetFails: false };
  return { state, FakeViewer };
});

vi.mock('cesium', () => ({
  Viewer: cesium.FakeViewer,
  Ion: { defaultAccessToken: '' },
  Cartesian3: {
    fromDegrees: (longitude: number, latitude: number, height: number) => ({
      longitude,
      latitude,
      height,
    }),
  },
  UrlTemplateImageryProvider: class {},
  ImageryLayer: class {},
  createGooglePhotorealistic3DTileset: () =>
    cesium.state.tilesetFails
      ? Promise.reject(new Error('no access'))
      : Promise.resolve({ kind: 'tileset' }),
}));

const view = { longitude: 2, latitude: 41, height: 700 };

describe('MapService', () => {
  let service: MapService;
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    cesium.state.viewers.length = 0;
    cesium.state.tilesetFails = false;
    container = document.createElement('div');
    service = TestBed.inject(MapService);
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  it('falls back to OpenStreetMap without a token and publishes the camera position', async () => {
    await service.init(container, { ionToken: null, initialView: view });

    expect(service.mode()).toBe('osm');
    expect(service.cameraPosition()).toEqual({ longitude: 90, latitude: 45, height: 700 });
    expect(cesium.state.viewers).toHaveLength(1);
  });

  it('loads the photorealistic tileset when a token is given', async () => {
    await service.init(container, { ionToken: 'token', initialView: view });

    expect(service.mode()).toBe('photorealistic');
    expect(cesium.state.viewers[0]?.scene.primitives.add).toHaveBeenCalledExactlyOnceWith({
      kind: 'tileset',
    });
  });

  it('falls back to OpenStreetMap and destroys the first viewer when the tileset fails', async () => {
    cesium.state.tilesetFails = true;

    await service.init(container, { ionToken: 'bad-token', initialView: view });

    expect(service.mode()).toBe('osm');
    expect(service.tilesError()).toBe('no access');
    expect(cesium.state.viewers).toHaveLength(2);
    expect(cesium.state.viewers[0]?.destroyed).toBe(true);
    expect(cesium.state.viewers[1]?.destroyed).toBe(false);
  });

  it('publishes the visible bbox only after the camera stops moving', async () => {
    await service.init(container, { ionToken: null, initialView: view });
    const [onCameraChanged] = [...(cesium.state.viewers[0]?.listeners ?? [])];

    onCameraChanged?.();
    onCameraChanged?.();
    expect(service.visibleBbox()).toBeNull();

    vi.advanceTimersByTime(250);
    expect(service.visibleBbox()).toEqual({ west: 0, south: 0, east: 90, north: 45 });
  });

  it('destroy releases the viewer and listeners, cancels the pending bbox and resets state', async () => {
    await service.init(container, { ionToken: null, initialView: view });
    const viewer = cesium.state.viewers[0];

    service.destroy();
    vi.advanceTimersByTime(1000);

    expect(viewer?.destroyed).toBe(true);
    expect(viewer?.listeners.size).toBe(0);
    expect(service.visibleBbox()).toBeNull();
    expect(service.cameraPosition()).toBeNull();
    expect(service.mode()).toBeNull();
    expect(service.tilesError()).toBeNull();
    expect(document.getElementById('cesium-widgets-css')).toBeNull();
  });

  it('destroy is safe to call twice', async () => {
    await service.init(container, { ionToken: null, initialView: view });

    service.destroy();

    expect(() => service.destroy()).not.toThrow();
  });

  it('does not create a viewer when destroyed while Cesium is still loading', async () => {
    const pending = service.init(container, { ionToken: null, initialView: view });
    service.destroy();
    await pending;

    expect(cesium.state.viewers).toHaveLength(0);
    expect(service.mode()).toBeNull();
  });

  it('re-initialising destroys the previous viewer', async () => {
    await service.init(container, { ionToken: null, initialView: view });
    await service.init(container, { ionToken: null, initialView: view });

    expect(cesium.state.viewers[0]?.destroyed).toBe(true);
    expect(cesium.state.viewers[1]?.destroyed).toBe(false);
  });

  it('flyTo moves the camera of the live viewer', async () => {
    await service.init(container, { ionToken: null, initialView: view });

    service.flyTo({ longitude: 10, latitude: 20, height: 300 });

    expect(cesium.state.viewers[0]?.camera.flyTo).toHaveBeenCalledExactlyOnceWith({
      destination: { longitude: 10, latitude: 20, height: 300 },
    });
  });
});
