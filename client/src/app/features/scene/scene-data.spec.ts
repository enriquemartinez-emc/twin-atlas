import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { client } from '@api/client.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneData } from './scene-data';

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
const scene = (id: string, name: string) => ({
  id,
  name,
  extent,
  createdAt: '2026-01-01T00:00:00Z',
});

/** Runs effects and waits for resources to settle after a flush. */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve, 0)); // let the resource resolve
  TestBed.tick();
};

describe('SceneData', () => {
  let http: HttpTestingController;

  const create = (remembered?: string) => {
    localStorage.clear();
    if (remembered) localStorage.setItem('twinatlas.sceneId', remembered);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client.setConfig({ httpClient: TestBed.inject(HttpClient), baseUrl: '' });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SceneData);
  };

  const flushList = async (scenes: ReturnType<typeof scene>[]) => {
    await settle();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/scenes')).flush(scenes);
    await settle();
  };

  beforeEach(() => localStorage.clear());

  it('lists the scenes and selects the newest when nothing was chosen', async () => {
    const service = create();

    await flushList([scene('new', 'Newest'), scene('old', 'Oldest')]);

    expect(service.scenes().map((s) => s.id)).toEqual(['new', 'old']);
    expect(service.selectedId()).toBe('new');
  });

  it('remembers the chosen scene in this browser', async () => {
    const service = create();
    await flushList([scene('new', 'Newest'), scene('old', 'Oldest')]);

    service.select('old');

    expect(service.selectedId()).toBe('old');
    expect(localStorage.getItem('twinatlas.sceneId')).toBe('old');
  });

  it('uses the remembered scene when it still exists', async () => {
    const service = create('old');

    await flushList([scene('new', 'Newest'), scene('old', 'Oldest')]);

    expect(service.selectedId()).toBe('old');
  });

  it('falls back to the newest scene when the remembered one is gone', async () => {
    const service = create();
    service.select('deleted');

    await flushList([scene('new', 'Newest')]);

    expect(service.selectedId()).toBe('new');
  });

  it('has no selection when there are no scenes', async () => {
    const service = create();

    await flushList([]);

    expect(service.selectedId()).toBeNull();
  });

  it('creates a scene, selects it at once and refreshes the list', async () => {
    const service = create();
    await flushList([scene('old', 'Oldest')]);

    const outcome = service.create('Plaza', extent);
    const post = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
    expect(post.request.body).toEqual({ name: 'Plaza', extent });
    post.flush(scene('made', 'Plaza'));

    expect(await outcome).toMatchObject({ ok: true, value: { id: 'made' } });
    expect(service.selectedId()).toBe('made');
    expect(service.scenes().map((s) => s.id)).toEqual(['made', 'old']);
    await settle();
    http
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/scenes'))
      .flush([scene('made', 'Plaza'), scene('old', 'Oldest')]);
    await settle();
    expect(service.scenes().map((s) => s.id)).toEqual(['made', 'old']); // not duplicated
  });

  it('returns the problem when creating fails', async () => {
    const service = create();
    await flushList([]);

    const outcome = service.create('Bad', extent);
    const post = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
    post.flush(
      { code: 'VALIDATION_FAILED', title: 't', detail: 'd', status: 400 },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await outcome).toEqual({
      ok: false,
      problem: expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    });
    expect(service.selectedId()).toBeNull();
  });

  it('keeps working when storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = create();
    await flushList([scene('new', 'Newest')]);

    expect(() => service.select('new')).not.toThrow();
    expect(service.selectedId()).toBe('new');
    vi.restoreAllMocks();
  });
});
