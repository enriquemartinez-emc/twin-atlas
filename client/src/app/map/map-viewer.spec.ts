import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapFeature } from './feature.model';
import { PALETTE } from './palette';
import { LABEL_RANGE_METRES } from './descriptors';
import { MapViewer } from './map-viewer';

const cesium = vi.hoisted(() => {
  type Listener = () => void;
  type ClickAction = (event: { position: unknown }) => void;

  class FakeEntities {
    readonly added: Record<string, unknown>[] = [];
    /** What the renderer would show, which follows Cesium's rules for batched changes. */
    readonly drawn = new Map<string, Record<string, unknown>>();
    removeAllCalls = 0;
    readonly suspendEvents = vi.fn(() => {
      this.suspended = true;
    });
    readonly resumeEvents = vi.fn(() => {
      for (const id of this.removedInBatch) {
        if (!this.added.some((entity) => entity['id'] === id)) this.drawn.delete(id);
      }
      this.removedInBatch.clear();
      this.suspended = false;
    });
    private suspended = false;
    private readonly removedInBatch = new Set<string>();

    add(options: Record<string, unknown>): Record<string, unknown> {
      this.added.push(options);
      const id = options['id'];
      if (typeof id === 'string') {
        // Cesium turns a remove and an add of one id inside a batch into "changed", and the
        // renderer then keeps the old drawing.
        if (!this.removedInBatch.has(id)) this.drawn.set(id, options);
      }
      return options;
    }

    removeAll(): void {
      for (const entity of this.added) {
        const id = entity['id'];
        if (typeof id !== 'string') continue;
        if (this.suspended) this.removedInBatch.add(id);
        else this.drawn.delete(id);
      }
      this.added.length = 0;
      this.removeAllCalls++;
    }
  }

  class FakeDataSource {
    readonly entities = new FakeEntities();
    constructor(readonly name: string) {}
  }

  class FakeEntity {
    constructor(readonly id: string) {}
  }

  class FakeHandler {
    readonly actions = new Map<number, ClickAction>();
    destroyed = false;

    constructor(readonly canvas: unknown) {
      state.handlers.push(this);
    }

    setInputAction(action: ClickAction, type: number): void {
      this.actions.set(type, action);
    }

    destroy(): void {
      this.destroyed = true;
    }
  }

  class FakeViewer {
    destroyed = false;
    readonly listeners = new Set<Listener>();
    readonly dataSources = {
      added: [] as FakeDataSource[],
      removed: [] as { source: FakeDataSource; destroy: boolean }[],
      add: (source: FakeDataSource) => {
        this.dataSources.added.push(source);
        return Promise.resolve(source);
      },
      remove: (source: FakeDataSource, destroy: boolean) => {
        this.dataSources.removed.push({ source, destroy });
        return true;
      },
    };
    readonly camera = {
      percentageChanged: 0,
      positionCartographic: { longitude: Math.PI / 2, latitude: Math.PI / 4, height: 700 },
      setView: vi.fn(),
      flyTo: vi.fn(),
      pickEllipsoid: vi.fn(() => undefined),
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
    readonly scene = {
      canvas: { kind: 'canvas' },
      primitives: { add: vi.fn() },
      pickPositionSupported: true,
      pick: vi.fn(() => state.pickResult),
      pickPosition: vi.fn(() => state.groundPoint),
    };

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

    source(name: string): FakeDataSource {
      const found = this.dataSources.added.find((s) => s.name === name);
      if (!found) throw new Error(`no data source ${name}`);
      return found;
    }
  }

  const state = {
    viewers: [] as FakeViewer[],
    handlers: [] as FakeHandler[],
    tilesetFails: false,
    pickResult: undefined as unknown,
    groundPoint: undefined as { longitude: number; latitude: number } | undefined,
  };

  const color = (css: string) => ({ css, withAlpha: (alpha: number) => ({ css, alpha }) });

  const module = {
    Viewer: FakeViewer,
    Ion: { defaultAccessToken: '' },
    CustomDataSource: FakeDataSource,
    Entity: FakeEntity,
    ScreenSpaceEventHandler: FakeHandler,
    ScreenSpaceEventType: { LEFT_CLICK: 5 },
    Ellipsoid: { WGS84: { kind: 'wgs84' } },
    Cartographic: { fromCartesian: (point: unknown) => point },
    Math: { toDegrees: (radians: number) => (radians * 180) / globalThis.Math.PI },
    Cartesian2: class {
      constructor(
        readonly x: number,
        readonly y: number,
      ) {}
    },
    Cartesian3: {
      fromDegrees: (longitude: number, latitude: number, height?: number) => ({
        longitude,
        latitude,
        height,
      }),
      fromDegreesArray: (degrees: number[]) => ({ degrees }),
    },
    Color: { fromCssColorString: color, WHITE: color('white'), BLACK: color('black') },
    LabelStyle: { FILL_AND_OUTLINE: 'fill-and-outline' },
    DistanceDisplayCondition: class {
      constructor(
        readonly near: number,
        readonly far: number,
      ) {}
    },
    PolygonHierarchy: class {
      constructor(readonly positions: unknown) {}
    },
    HeightReference: { CLAMP_TO_GROUND: 'ground', CLAMP_TO_3D_TILE: 'tiles' },
    ClassificationType: { TERRAIN: 'terrain', CESIUM_3D_TILE: 'tiles' },
    UrlTemplateImageryProvider: class {},
    ImageryLayer: class {},
    createGooglePhotorealistic3DTileset: () =>
      state.tilesetFails
        ? Promise.reject(new Error('no access'))
        : Promise.resolve({ kind: 'tileset' }),
  };
  return { state, module, FakeEntity };
});

vi.mock('cesium', () => cesium.module);

const view = { longitude: 2, latitude: 41, height: 700 };

const marker: MapFeature = {
  id: 'm1',
  kind: 'MARKER',
  label: 'Cracked window',
  geometry: { type: 'Point', coordinates: [2.175, 41.405] },
};
const outline: MapFeature = {
  id: 'o1',
  kind: 'OUTLINE',
  label: 'Inspection area',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [2.17, 41.4],
        [2.18, 41.4],
        [2.18, 41.41],
        [2.17, 41.4],
      ],
    ],
  },
};

describe('MapViewer', () => {
  let service: MapViewer;
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    cesium.state.viewers.length = 0;
    cesium.state.handlers.length = 0;
    cesium.state.tilesetFails = false;
    cesium.state.pickResult = undefined;
    cesium.state.groundPoint = undefined;
    container = document.createElement('div');
    service = TestBed.inject(MapViewer);
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  const viewer = () => {
    const first = cesium.state.viewers[0];
    if (!first) throw new Error('no viewer was created');
    return first;
  };

  it('falls back to OpenStreetMap without a token and publishes the camera position', async () => {
    await service.init(container, { ionToken: null, initialView: view });

    expect(service.mode()).toBe('osm');
    expect(service.cameraPosition()).toEqual({ longitude: 90, latitude: 45, height: 700 });
    expect(cesium.state.viewers).toHaveLength(1);
  });

  it('loads the photorealistic tileset when a token is given', async () => {
    await service.init(container, { ionToken: 'token', initialView: view });

    expect(service.mode()).toBe('photorealistic');
    expect(viewer().scene.primitives.add).toHaveBeenCalledExactlyOnceWith({
      kind: 'tileset',
      maximumScreenSpaceError: 8,
    });
  });

  it("renders at the screen's real resolution on both kinds of globe", async () => {
    await service.init(container, { ionToken: 'token', initialView: view });
    await service.init(container, { ionToken: null, initialView: view });

    expect(cesium.state.viewers.map((v) => v.options['useBrowserRecommendedResolution'])).toEqual([
      false,
      false,
    ]);
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
    const [onCameraChanged] = [...viewer().listeners];

    onCameraChanged?.();
    onCameraChanged?.();
    expect(service.visibleBbox()).toBeNull();

    vi.advanceTimersByTime(250);
    expect(service.visibleBbox()).toEqual({ west: 0, south: 0, east: 90, north: 45 });
  });

  it('destroy releases the viewer and listeners, cancels the pending bbox and resets state', async () => {
    await service.init(container, { ionToken: null, initialView: view });
    const first = viewer();

    service.destroy();
    vi.advanceTimersByTime(1000);

    expect(first.destroyed).toBe(true);
    expect(first.listeners.size).toBe(0);
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

  it('epoch goes up each time a viewer is built, so callers can redraw', async () => {
    expect(service.epoch()).toBe(0);

    await service.init(container, { ionToken: null, initialView: view });
    expect(service.epoch()).toBe(1);

    await service.init(container, { ionToken: null, initialView: view });
    expect(service.epoch()).toBe(2);
  });

  it('flyTo moves the camera of the live viewer', async () => {
    await service.init(container, { ionToken: null, initialView: view });

    service.flyTo({ longitude: 10, latitude: 20, height: 300 });

    expect(viewer().camera.flyTo).toHaveBeenCalledExactlyOnceWith({
      destination: { longitude: 10, latitude: 20, height: 300 },
    });
  });

  describe('annotation layer', () => {
    it('draws every feature and replaces them on each refresh', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      const annotations = viewer().source('annotations').entities;

      service.setFeatures([marker, outline], null);
      expect(annotations.added.map((e) => e['id'])).toEqual(['m1', 'o1']);

      service.setFeatures([marker], null);
      expect(annotations.added.map((e) => e['id'])).toEqual(['m1']);
      expect(annotations.removeAllCalls).toBe(2);
      expect(annotations.suspendEvents).toHaveBeenCalledTimes(2);
      expect(annotations.resumeEvents).toHaveBeenCalledTimes(2);
    });

    it('shows a new selection even when the same feature was already drawn', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      const annotations = viewer().source('annotations').entities;
      service.setFeatures([marker], null);

      service.setFeatures([marker], 'm1');

      const point = annotations.drawn.get('m1')?.['point'] as { color: { css: string } };
      expect(point.color.css).toBe(PALETTE.SELECTED);
    });

    it('colours the selected feature and clamps to the ground on the OSM globe', async () => {
      await service.init(container, { ionToken: null, initialView: view });

      service.setFeatures([marker], 'm1');

      const point = viewer().source('annotations').entities.added[0]?.['point'] as {
        color: { css: string };
        heightReference: string;
      };
      expect(point.color.css).toBe(PALETTE.SELECTED);
      expect(point.heightReference).toBe('ground');
    });

    it('labels a point only when the camera is near, but always the selected one', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      const added = () => viewer().source('annotations').entities.added[0];
      const labelRange = () =>
        (added()?.['label'] as { distanceDisplayCondition?: { far: number } })
          .distanceDisplayCondition?.far;

      service.setFeatures([marker], null);
      expect(labelRange()).toBe(LABEL_RANGE_METRES);

      service.setFeatures([marker], 'm1');
      expect(labelRange()).toBeUndefined();
    });

    it('clamps to the 3D tiles in photorealistic mode', async () => {
      await service.init(container, { ionToken: 'token', initialView: view });

      service.setFeatures([marker], null);

      const point = viewer().source('annotations').entities.added[0]?.['point'] as {
        heightReference: string;
      };
      expect(point.heightReference).toBe('tiles');
    });

    it('previews the draft as points, a line and, once closed, an area', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      const draft = viewer().source('draft').entities;
      const points = [
        { longitude: 1, latitude: 2 },
        { longitude: 3, latitude: 4 },
        { longitude: 5, latitude: 6 },
      ];

      service.setDraft(points, true);
      expect(draft.added).toHaveLength(5); // three points, a line, an area

      service.setDraft(points.slice(0, 1), true);
      expect(draft.added).toHaveLength(1);

      service.setDraft([], false);
      expect(draft.added).toHaveLength(0);
    });

    it('ignores drawing calls before the map exists', () => {
      expect(() => {
        service.setFeatures([marker], null);
        service.setDraft([], false);
      }).not.toThrow();
    });
  });

  describe('clicks', () => {
    const click = () => {
      const handler = cesium.state.handlers[0];
      const action = handler?.actions.get(5);
      if (!action) throw new Error('no click handler registered');
      action({ position: { x: 1, y: 2 } });
    };

    it('reports where the ground was hit', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      cesium.state.groundPoint = { longitude: Math.PI / 6, latitude: Math.PI / 4 };

      click();

      expect(service.lastClick()).toEqual({
        longitude: expect.closeTo(30, 9),
        latitude: expect.closeTo(45, 9),
        featureId: null,
        sequence: 1,
      });
    });

    it('reports the feature under the cursor and gives every click a new sequence', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      cesium.state.groundPoint = { longitude: 0, latitude: 0 };
      cesium.state.pickResult = { id: new cesium.FakeEntity('m1') };

      click();
      expect(service.lastClick()?.featureId).toBe('m1');

      cesium.state.pickResult = undefined;
      click();
      expect(service.lastClick()).toMatchObject({ featureId: null, sequence: 2 });
    });

    it('reports no coordinates when the click misses the globe', async () => {
      await service.init(container, { ionToken: null, initialView: view });

      click();

      expect(service.lastClick()).toMatchObject({ longitude: null, latitude: null });
    });

    it('destroy releases the click handler and both data sources', async () => {
      await service.init(container, { ionToken: null, initialView: view });
      click();
      const first = viewer();

      service.destroy();

      expect(cesium.state.handlers[0]?.destroyed).toBe(true);
      expect(first.dataSources.removed).toHaveLength(2);
      expect(first.dataSources.removed.every((r) => r.destroy)).toBe(true);
      expect(service.lastClick()).toBeNull();
    });
  });
});
