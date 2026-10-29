import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';
import { client } from '@api/client.gen';
import { MapViewer } from '@map/map-viewer';
import type { Bbox } from '@map/bbox';
import type { MapClick } from '@map/feature.model';
import type { MapMode } from '@map/map-viewer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Scene } from './scene';

/** Stands in for the Cesium-backed service: same signals and methods, no WebGL. */
class FakeMap {
  readonly visibleBbox = signal<Bbox | null>({ west: 2.17, south: 41.4, east: 2.18, north: 41.41 });
  readonly cameraPosition = signal({ longitude: 2.175, latitude: 41.405, height: 700 });
  readonly mode = signal<MapMode | null>('osm');
  readonly tilesError = signal<string | null>(null);
  readonly lastClick = signal<MapClick | null>(null);
  readonly epoch = signal(1);
  readonly tilesReady = signal(true);
  readonly init = vi.fn(() => Promise.resolve());
  readonly setFeatures = vi.fn();
  readonly setDraft = vi.fn();
  readonly flyTo = vi.fn();
  readonly destroy = vi.fn();
}

const extent = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [2.17, 41.4],
      [2.18, 41.4],
      [2.18, 41.41],
      [2.17, 41.4],
    ],
  ],
};
const scene = { id: 's1', name: 'Plaza', extent, createdAt: '2026-01-01T00:00:00Z' };
const annotation = (id: string, title: string) => ({
  id,
  sceneId: 's1',
  kind: 'MARKER' as const,
  title,
  body: null,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point' as const, coordinates: [2.175, 41.405] },
});

describe('Scene', () => {
  let fixture: ComponentFixture<unknown>;
  let http: HttpTestingController;
  let map: FakeMap;
  let clickSequence = 0;

  const el = (): HTMLElement => fixture.nativeElement;

  const settle = async () => {
    for (let round = 0; round < 2; round++) {
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 0));
      TestBed.tick();
    }
    fixture.detectChanges();
  };

  const listRequest = () =>
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/api/scenes/s1/annotations?'));
  const scenesRequest = () =>
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/scenes'));

  const open = async (annotations = [annotation('a1', 'Cracked window')]) => {
    fixture = TestBed.createComponent(Scene);
    await settle();
    scenesRequest().flush([scene]);
    await settle();
    listRequest().flush({ items: annotations, nextCursor: null });
    await settle();
  };

  /** Dialogs open in an overlay outside the page, so the lookups search it too. */
  const everywhere = (): readonly ParentNode[] => [
    el(),
    ...document.querySelectorAll('.cdk-overlay-container'),
  ];

  const button = (label: string): HTMLButtonElement => {
    const found = everywhere()
      .flatMap((root) => [...root.querySelectorAll('button')])
      .find((b) => b.textContent?.trim() === label);
    if (!found) throw new Error(`no "${label}" button`);
    return found;
  };

  const chosenScene = () => el().querySelector('#scene-select')?.textContent?.trim();

  const pickScene = async (name: string) => {
    el().querySelector<HTMLButtonElement>('#scene-select')?.click();
    await settle();
    const item = [...document.querySelectorAll('hlm-select-item')].find((i) =>
      i.textContent?.includes(name),
    );
    if (!(item instanceof HTMLElement)) throw new Error(`no "${name}" scene in the list`);
    item.click();
    await settle();
  };

  const openNewScene = async () => {
    button('New scene').click();
    await settle();
  };

  const click = (longitude: number, latitude: number, featureId: string | null = null) =>
    map.lastClick.set({ longitude, latitude, featureId, sequence: ++clickSequence });

  const type = async (selector: string, text: string) => {
    const input = everywhere()
      .map((root) => root.querySelector<HTMLInputElement>(selector))
      .find((found) => found !== null);
    if (!input) throw new Error(`no ${selector}`);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  };

  const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1) ?? [];

  beforeEach(() => {
    localStorage.clear();
    map = new FakeMap();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MapViewer, useValue: map },
      ],
    });
    client.setConfig({ httpClient: TestBed.inject(HttpClient), baseUrl: '' });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts the map, picks the newest scene and draws the annotations of the visible area', async () => {
    await open();

    expect(map.init).toHaveBeenCalledOnce();
    expect(chosenScene()).toBe('Plaza');
    expect(el().textContent).toContain('Cracked window');
    const [features, selected] = lastCall(map.setFeatures);
    expect(features).toEqual([expect.objectContaining({ id: 'a1', label: 'Cracked window' })]);
    expect(selected).toBeNull();
  });

  it('asks the server only for what is inside the visible area', async () => {
    fixture = TestBed.createComponent(Scene);
    await settle();
    scenesRequest().flush([scene]);
    await settle();

    const request = listRequest();

    const query = new URL(request.request.urlWithParams, 'http://localhost').searchParams;
    expect(query.get('bbox')).toBe('2.17,41.4,2.18,41.41');
    request.flush({ items: [], nextCursor: null });
  });

  it('shows which tool is chosen, to assistive technology too', async () => {
    await open();
    const pressed = (label: string) => button(label).getAttribute('aria-pressed');

    expect([pressed('Select'), pressed('Marker')]).toEqual(['true', 'false']);

    button('Marker').click();
    await settle();

    expect([pressed('Select'), pressed('Marker'), pressed('Outline')]).toEqual([
      'false',
      'true',
      'false',
    ]);

    button('Select').click();
    await settle();

    expect([pressed('Select'), pressed('Marker')]).toEqual(['true', 'false']);
  });

  it('moves the highlight back to Select when the app leaves drawing mode', async () => {
    await open();

    button('Marker').click();
    await settle();
    expect(button('Marker').getAttribute('aria-pressed')).toBe('true');

    button('Cancel').click();
    await settle();

    expect(button('Select').getAttribute('aria-pressed')).toBe('true');
    expect(button('Marker').getAttribute('aria-pressed')).toBe('false');
  });

  it('places a marker with a click, saves it and returns to select mode', async () => {
    await open();

    button('Marker').click();
    await settle();
    expect(el().textContent).toContain('New marker');
    click(2.176, 41.406);
    await settle();
    expect(lastCall(map.setDraft)).toEqual([[{ longitude: 2.176, latitude: 41.406 }], false]);

    await type('#annotation-title', 'Loose tile');
    button('Save').click();
    await settle();

    const post = http.expectOne((r) => r.method === 'POST' && r.url.includes('/annotations'));
    expect(post.request.body).toEqual({
      kind: 'MARKER',
      title: 'Loose tile',
      geometry: { type: 'Point', coordinates: [2.176, 41.406] },
    });
    post.flush(annotation('a2', 'Loose tile'));
    await settle();

    listRequest().flush({
      items: [annotation('a1', 'Cracked window'), annotation('a2', 'Loose tile')],
      nextCursor: null,
    });
    await settle();
    expect(el().textContent).not.toContain('New marker');
    expect(el().textContent).toContain('Loose tile');
    expect(lastCall(map.setDraft)).toEqual([[], false]);
    expect(lastCall(map.setFeatures)[1]).toBe('a2');
  });

  it('shows a readable message and keeps the draft when the server rejects the annotation', async () => {
    await open();
    button('Marker').click();
    await settle();
    click(2.176, 41.406);
    await type('#annotation-title', 'Cracked window');

    button('Save').click();
    await settle();
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { code: 'TITLE_ALREADY_USED', title: 't', detail: 'd', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(el().textContent).toContain('already has that title');
    expect(el().textContent).toContain('New marker'); // the form stays open to fix it
    expect(lastCall(map.setDraft)[0]).toHaveLength(1);
  });

  it('draws an outline from several clicks and needs three corners before it can be saved', async () => {
    await open();
    button('Outline').click();
    await settle();
    const save = () => button('Save');

    click(2.171, 41.401);
    await settle();
    click(2.179, 41.401);
    await settle();
    expect(save().disabled).toBe(true);

    click(2.179, 41.409);
    await settle();
    expect(save().disabled).toBe(false);
    expect(lastCall(map.setDraft)[1]).toBe(true);

    await type('#annotation-title', 'Inspection area');
    save().click();
    await settle();
    const post = http.expectOne((r) => r.method === 'POST');
    expect(post.request.body).toMatchObject({
      kind: 'OUTLINE',
      title: 'Inspection area',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [2.171, 41.401],
            [2.179, 41.401],
            [2.179, 41.409],
            [2.171, 41.401],
          ],
        ],
      },
    });
    post.flush({ ...annotation('o1', 'Inspection area'), kind: 'OUTLINE' });
  });

  it('a note click replaces the previous point instead of adding corners', async () => {
    await open();
    button('Note').click();
    await settle();

    click(2.172, 41.402);
    await settle();
    click(2.178, 41.408);
    await settle();

    expect(lastCall(map.setDraft)[0]).toEqual([{ longitude: 2.178, latitude: 41.408 }]);
  });

  it('selecting a tool again clears the draft and any earlier error', async () => {
    await open();
    button('Marker').click();
    await settle();
    click(2.176, 41.406);
    await settle();

    button('Select').click();
    await settle();

    expect(lastCall(map.setDraft)[0]).toEqual([]);
    expect(el().textContent).not.toContain('New marker');
  });

  it('says what to do next as the tool is used, and nothing in select mode', async () => {
    await open();
    const hint = () => el().querySelector('.hint')?.textContent?.trim() ?? null;
    expect(hint()).toBeNull();

    button('Marker').click();
    await settle();
    expect(hint()).toBe('Click the map to place the marker.');

    click(2.175, 41.405);
    await settle();
    expect(hint()).toContain('Placed.');

    button('Select').click();
    await settle();
    expect(hint()).toBeNull();
  });

  it('gives the panel to the form while drawing and back to the list afterwards', async () => {
    await open();
    expect(el().querySelector('app-annotation-list')).not.toBeNull();

    button('Marker').click();
    await settle();
    expect(el().querySelector('app-annotation-list')).toBeNull();
    expect(el().querySelector('app-annotation-form')).not.toBeNull();

    button('Cancel').click();
    await settle();
    expect(el().querySelector('app-annotation-list')).not.toBeNull();
    expect(el().querySelector('app-annotation-form')).toBeNull();
  });

  it('shows no tools and asks for a scene when there is none', async () => {
    fixture = TestBed.createComponent(Scene);
    await settle();
    scenesRequest().flush([]);
    await settle();

    expect(el().querySelector('app-tool-rail')).toBeNull();
    expect(el().querySelector('aside')?.textContent).toContain('No scene open');
  });

  it('selects an annotation when it is clicked on the map in select mode', async () => {
    await open();

    click(2.175, 41.405, 'a1');
    await settle();

    expect(lastCall(map.setFeatures)[1]).toBe('a1');
  });

  it('flies to an annotation picked from the list', async () => {
    await open();

    el().querySelector<HTMLButtonElement>('app-annotation-list li button')?.click();
    await settle();

    expect(lastCall(map.flyTo)).toEqual([{ longitude: 2.175, latitude: 41.405, height: 250 }]);
    expect(lastCall(map.setFeatures)[1]).toBe('a1');
  });

  it('creates a scene covering the visible area and selects it', async () => {
    await open();
    await openNewScene();
    await type('#scene-name', 'Old town');

    button('Create scene from this view').click();
    await settle();

    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/scenes'));
    expect(post.request.body).toEqual({
      name: 'Old town',
      extent: {
        type: 'Polygon',
        coordinates: [
          [
            [2.17, 41.4],
            [2.18, 41.4],
            [2.18, 41.41],
            [2.17, 41.41],
            [2.17, 41.4],
          ],
        ],
      },
    });
    post.flush({ ...scene, id: 's2', name: 'Old town' });
    await settle();

    expect(chosenScene()).toBe('Old town');
    expect(document.querySelector('#scene-name')).toBeNull();
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it('will not create a scene from a view that crosses the date line', async () => {
    await open();
    map.visibleBbox.set({ west: 179, south: 0, east: -179, north: 1 });
    await settle();
    http.match(() => true).forEach((r) => r.flush({ items: [], nextCursor: null }));
    await openNewScene();
    await type('#scene-name', 'Pacific');

    button('Create scene from this view').click();
    await settle();

    expect(http.match((r) => r.method === 'POST')).toHaveLength(0);
    expect(document.body.textContent).toContain('crosses the date line');
  });

  it('redraws the annotations when the map is rebuilt', async () => {
    await open();
    const calls = map.setFeatures.mock.calls.length;

    map.epoch.set(2);
    await settle();

    expect(map.setFeatures.mock.calls.length).toBeGreaterThan(calls);
  });

  it('shows a message when the viewer cannot start', async () => {
    map.init.mockRejectedValueOnce(new Error('WebGL is not supported'));
    fixture = TestBed.createComponent(Scene);

    await settle();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('WebGL is not supported');
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it('shows a loading notice until the first view of the map is ready', async () => {
    map.tilesReady.set(false);
    await open();
    expect(el().querySelector('app-map-loading')).not.toBeNull();

    map.tilesReady.set(true);
    await settle();

    expect(el().querySelector('app-map-loading')).toBeNull();
  });

  it('does not show the loading notice when the viewer could not start', async () => {
    map.tilesReady.set(false);
    map.init.mockRejectedValueOnce(new Error('WebGL is not supported'));
    fixture = TestBed.createComponent(Scene);

    await settle();

    expect(el().querySelector('app-map-loading')).toBeNull();
    expect(el().querySelector('[role="alert"]')).not.toBeNull();
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it('releases the map when the page is destroyed', async () => {
    await open();

    fixture.destroy();

    expect(map.destroy).toHaveBeenCalledOnce();
  });

  describe('the panel', () => {
    const labelled = (text: string) =>
      [...el().querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === text,
      );
    const stubClipboard = (writeText: () => Promise<void>) =>
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    it('says the 3D viewer is starting until it is up', async () => {
      fixture = TestBed.createComponent(Scene);
      fixture.detectChanges();
      expect(el().textContent).toContain('Starting the 3D viewer');

      await settle();

      expect(el().textContent).not.toContain('Starting the 3D viewer');
      expect(el().textContent).not.toContain('Loading the map');
    });

    it('copies the address, which carries the scene and the annotation, and says so', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      stubClipboard(writeText);
      await open();

      labelled('Copy link')?.click();
      await settle();

      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(labelled('Link copied')).toBeDefined();
    });

    it('says plainly when the address could not be copied', async () => {
      stubClipboard(() => Promise.reject(new Error('denied')));
      await open();

      labelled('Copy link')?.click();
      await settle();

      expect(labelled('Could not copy')).toBeDefined();
    });

    it('can be hidden, and shown again with a button that stays on the map', async () => {
      await open();
      const panel = () => el().querySelector<HTMLElement>('aside');
      const showButton = () => el().querySelector<HTMLButtonElement>('.show-panel');
      expect(panel()?.hidden).toBe(false);
      expect(showButton()?.hidden).toBe(true);

      labelled('Hide panel')?.click();
      await settle();
      expect(panel()?.hidden).toBe(true);
      expect(showButton()?.hidden).toBe(false);

      showButton()?.click();
      await settle();
      expect(panel()?.hidden).toBe(false);
      expect(showButton()?.hidden).toBe(true);
    });

    it('keeps what was typed when the panel is hidden and shown again', async () => {
      await open();
      button('Marker').click();
      await settle();
      await type('#annotation-title', 'Loose tile');

      labelled('Hide panel')?.click();
      await settle();
      el().querySelector<HTMLButtonElement>('.show-panel')?.click();
      await settle();

      expect(el().querySelector<HTMLInputElement>('#annotation-title')?.value).toBe('Loose tile');
    });
  });

  describe('routing', () => {
    const annotationRequest = (id: string) => (r: { method: string; url: string }) =>
      r.method === 'GET' && r.url.endsWith(`/api/scenes/s1/annotations/${id}`);
    const other = { ...scene, id: 's2', name: 'Other' };

    /** Opens the page the way the router does: from an address, with route values as inputs. */
    const openAt = async (url: string, scenes = [scene]) => {
      const harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl(url, Scene);
      fixture = harness.fixture;
      await settle();
      scenesRequest().flush(scenes);
      await settle();
      return { harness, page };
    };

    it('opens the scene and the annotation named in the address', async () => {
      await openAt('/scenes/s1?annotation=a1');
      listRequest().flush({ items: [annotation('a1', 'Cracked window')], nextCursor: null });
      await settle();
      http
        .expectOne(annotationRequest('a1'))
        .flush(annotation('a1', 'Cracked window'), { headers: { ETag: '"2"' } });
      await settle();

      expect(chosenScene()).toBe('Plaza');
      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Cracked window');
    });

    it('prefers the scene in the address over the one used last', async () => {
      localStorage.setItem('twinatlas.sceneId', 's2');

      await openAt('/scenes/s1', [scene, other]);

      expect(chosenScene()).toBe('Plaza');
      listRequest().flush({ items: [], nextCursor: null });
    });

    it('shows the scene used last at /scenes', async () => {
      localStorage.setItem('twinatlas.sceneId', 's2');

      await openAt('/scenes', [scene, other]);

      expect(chosenScene()).toBe('Other');
    });

    it('puts the chosen annotation into the address', async () => {
      await openAt('/scenes/s1');
      listRequest().flush({ items: [annotation('a1', 'Cracked window')], nextCursor: null });
      await settle();

      el().querySelector<HTMLButtonElement>('app-annotation-list li button')?.click();
      await settle();

      expect(TestBed.inject(Router).url).toBe('/scenes/s1?annotation=a1');
    });

    it('clears the annotation from the address when the editor is closed', async () => {
      await openAt('/scenes/s1?annotation=a1');
      listRequest().flush({ items: [annotation('a1', 'Cracked window')], nextCursor: null });
      await settle();
      http
        .expectOne(annotationRequest('a1'))
        .flush(annotation('a1', 'Cracked window'), { headers: { ETag: '"2"' } });
      await settle();

      button('Close').click();
      await settle();

      expect(TestBed.inject(Router).url).toBe('/scenes/s1');
    });

    it('moves to the address of the scene that is chosen', async () => {
      await openAt('/scenes/s1', [scene, other]);
      listRequest().flush({ items: [], nextCursor: null });
      await settle();

      await pickScene('Other');

      expect(TestBed.inject(Router).url).toBe('/scenes/s2');
      expect(chosenScene()).toBe('Other');
    });

    it('keeps the page and its map when the scene changes', async () => {
      const { harness, page } = await openAt('/scenes', [scene, other]);

      const again = await harness.navigateByUrl('/scenes/s2', Scene);

      expect(again).toBe(page);
      expect(map.init).toHaveBeenCalledOnce();
    });

    it('follows the address when it changes to another annotation', async () => {
      const { harness } = await openAt('/scenes/s1?annotation=a1');
      listRequest().flush({ items: [], nextCursor: null });
      await settle();
      http
        .expectOne(annotationRequest('a1'))
        .flush(annotation('a1', 'Cracked window'), { headers: { ETag: '"2"' } });
      await settle();

      await harness.navigateByUrl('/scenes/s1?annotation=a2', Scene);
      await settle();
      http
        .expectOne(annotationRequest('a2'))
        .flush(annotation('a2', 'Leak'), { headers: { ETag: '"1"' } });
      await settle();

      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Leak');
    });
  });

  describe('editing an annotation', () => {
    const detailUrl = (r: { method: string; url: string }) =>
      r.method === 'GET' && r.url.endsWith('/api/scenes/s1/annotations/a1');

    const responseBody = (title: string) => ({ ...annotation('a1', title), body: null });

    const openEditor = async (etag = '"2"') => {
      await open();
      el().querySelector<HTMLButtonElement>('app-annotation-list li button')?.click();
      await settle();
      http.expectOne(detailUrl).flush(responseBody('Cracked window'), { headers: { ETag: etag } });
      await settle();
    };

    const saveChanges = async () => {
      button('Save changes').click();
      await settle();
    };

    it('shows the editor with the values the server returned', async () => {
      await openEditor();

      expect(el().textContent).toContain('Edit marker');
      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Cracked window');
    });

    it('does not show the editor while placing something new', async () => {
      await openEditor();

      button('Marker').click();
      await settle();

      expect(el().textContent).not.toContain('Edit marker');
      expect(el().textContent).toContain('New marker');
    });

    it('renames with only the title, sends the version it read, then refreshes', async () => {
      await openEditor('"2"');
      await type('#edit-title', 'Loose tile');

      await saveChanges();

      const patch = http.expectOne((r) => r.method === 'PATCH');
      expect(patch.request.url).toContain('/api/scenes/s1/annotations/a1');
      expect(patch.request.headers.get('If-Match')).toBe('"2"');
      expect(patch.request.body).toEqual({ title: 'Loose tile' });
      patch.flush(responseBody('Loose tile'), { headers: { ETag: '"3"' } });
      await settle();

      expect(http.match((r) => r.method === 'GET' && r.url.includes('/annotations?'))).toHaveLength(
        1,
      );
      const reread = http.expectOne(detailUrl);
      reread.flush(responseBody('Loose tile'), { headers: { ETag: '"3"' } });
      await settle();
      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Loose tile');
      expect(el().textContent).not.toContain('Someone changed');
    });

    it('moves a pin: the next click on the map is the new position', async () => {
      await openEditor();

      button('Move on map').click();
      await settle();
      expect(el().textContent).toContain('Click the map to choose the new position.');
      click(2.172, 41.402);
      await settle();
      expect(lastCall(map.setDraft)[0]).toEqual([{ longitude: 2.172, latitude: 41.402 }]);
      expect(lastCall(map.setFeatures)[1]).toBe('a1'); // clicking the map did not change the selection

      await saveChanges();

      const patch = http.expectOne((r) => r.method === 'PATCH');
      expect(patch.request.body).toEqual({
        geometry: { type: 'Point', coordinates: [2.172, 41.402] },
      });
      patch.flush(responseBody('Cracked window'), { headers: { ETag: '"3"' } });
      await settle();
      expect(lastCall(map.setDraft)[0]).toEqual([]);
      http.match(() => true).forEach((r) => r.flush([]));
    });

    it('can give up on a move and keep the position', async () => {
      await openEditor();
      button('Move on map').click();
      await settle();
      click(2.172, 41.402);
      await settle();

      button('Keep position').click();
      await settle();

      expect(lastCall(map.setDraft)[0]).toEqual([]);
      expect(button('Save changes').disabled).toBe(true);
    });

    it('offers the latest version when someone else changed it, and loads it', async () => {
      await openEditor('"2"');
      await type('#edit-title', 'My edit');
      await saveChanges();
      http
        .expectOne((r) => r.method === 'PATCH')
        .flush(
          { code: 'STALE_VERSION', title: 't', detail: 'd', status: 412 },
          { status: 412, statusText: 'Precondition Failed' },
        );
      await settle();

      expect(el().textContent).toContain('Someone changed this annotation');
      button('Load latest version').click();
      await settle();

      http
        .expectOne(detailUrl)
        .flush(responseBody('Renamed elsewhere'), { headers: { ETag: '"5"' } });
      http
        .match((r) => r.method === 'GET' && r.url.includes('/annotations?'))
        .forEach((r) => r.flush({ items: [], nextCursor: null }));
      await settle();
      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Renamed elsewhere');
      expect(el().textContent).not.toContain('Someone changed this annotation');

      // the next save uses the new version
      await type('#edit-title', 'Second try');
      await saveChanges();
      expect(http.expectOne((r) => r.method === 'PATCH').request.headers.get('If-Match')).toBe(
        '"5"',
      );
    });

    it('also offers the latest version after a lost race (409 conflict)', async () => {
      await openEditor();
      await type('#edit-title', 'My edit');
      await saveChanges();

      http
        .expectOne((r) => r.method === 'PATCH')
        .flush(
          { code: 'CONCURRENT_MODIFICATION', title: 't', detail: 'd', status: 409 },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();

      expect(button('Load latest version')).toBeDefined();
    });

    it('explains a rejection that is not a conflict, without offering to reload', async () => {
      await openEditor();
      await type('#edit-title', 'Taken title');
      await saveChanges();

      http
        .expectOne((r) => r.method === 'PATCH')
        .flush(
          { code: 'TITLE_ALREADY_USED', title: 't', detail: 'd', status: 409 },
          { status: 409, statusText: 'Conflict' },
        );
      await settle();

      expect(el().textContent).toContain('already has that title');
      expect(() => button('Load latest version')).toThrow();
      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Taken title');
    });

    it('starts half-finished edits afresh when another annotation is chosen', async () => {
      await open([annotation('a1', 'Cracked window'), annotation('a2', 'Leak')]);
      el().querySelector<HTMLButtonElement>('app-annotation-list li button')?.click();
      await settle();
      http.expectOne(detailUrl).flush(responseBody('Cracked window'), { headers: { ETag: '"2"' } });
      await settle();
      button('Move on map').click();
      await settle();
      expect(el().textContent).toContain('Click the map to choose the new position.');

      fixture.componentRef.setInput('annotation', 'a2');
      await settle();
      http
        .expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/scenes/s1/annotations/a2'))
        .flush({ ...annotation('a2', 'Leak'), body: null }, { headers: { ETag: '"1"' } });
      await settle();

      expect(el().querySelector<HTMLInputElement>('#edit-title')?.value).toBe('Leak');
      expect(el().textContent).not.toContain('Click the map to choose the new position.');
    });

    it('gives the panel to the editor while an annotation is open, and back to the list when it closes', async () => {
      await openEditor();
      expect(el().querySelector('app-annotation-list')).toBeNull();

      button('Close').click();
      await settle();

      expect(el().querySelector('app-annotation-list')).not.toBeNull();
    });

    it('closing the editor clears the selection', async () => {
      await openEditor();

      button('Close').click();
      await settle();

      expect(el().textContent).not.toContain('Edit marker');
      expect(lastCall(map.setFeatures)[1]).toBeNull();
    });

    it('tells the user when the selected annotation cannot be loaded', async () => {
      await open();
      el().querySelector<HTMLButtonElement>('app-annotation-list li button')?.click();
      await settle();

      http
        .expectOne(detailUrl)
        .flush({ code: 'ANNOTATION_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(el().textContent).toContain('Could not load this annotation.');
    });
  });
});
