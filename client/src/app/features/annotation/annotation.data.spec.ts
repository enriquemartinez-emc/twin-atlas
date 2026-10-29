import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { client } from '@api/client.gen';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnotationData } from './annotation.data';

const summary = (id: string, title: string) => ({
  id,
  sceneId: 'scene-1',
  kind: 'MARKER' as const,
  title,
  body: null,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point' as const, coordinates: [2.175, 41.405] },
});

const view = { west: 2.17, south: 41.4, east: 2.18, north: 41.41 };

/** Runs effects and waits for resources to settle after a flush. */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve, 0)); // let the resource resolve
  TestBed.tick();
};

describe('AnnotationData', () => {
  let data: AnnotationData;
  let http: HttpTestingController;

  const listRequests = () => http.match((r) => r.url.includes('/annotations'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client.setConfig({ httpClient: TestBed.inject(HttpClient), baseUrl: '' });
    data = TestBed.inject(AnnotationData);
    http = TestBed.inject(HttpTestingController);
  });

  describe('loading the view', () => {
    it('does not call the server until there is a scene and a view', async () => {
      await settle();
      expect(listRequests()).toHaveLength(0);

      data.sceneId.set('scene-1');
      await settle();
      expect(listRequests()).toHaveLength(0);

      data.view.set(view);
      await settle();
      expect(listRequests()).toHaveLength(1);
    });

    it('asks for the scene, the visible bbox and one page', async () => {
      data.sceneId.set('scene-1');
      data.view.set(view);
      await settle();

      const request = http.expectOne((r) => r.url.includes('/api/scenes/scene-1/annotations'));

      expect(request.request.method).toBe('GET');
      const query = new URL(request.request.urlWithParams, 'http://localhost').searchParams;
      expect(query.get('bbox')).toBe('2.17,41.4,2.18,41.41');
      expect(query.get('limit')).toBe('200');
      request.flush({ items: [], nextCursor: null });
    });

    it('exposes the items and whether the page was cut off', async () => {
      data.sceneId.set('scene-1');
      data.view.set(view);
      await settle();
      http
        .expectOne((r) => r.url.includes('/annotations'))
        .flush({ items: [summary('a', 'One'), summary('b', 'Two')], nextCursor: 'more' });
      await settle();

      expect(data.items().map((i) => i.title)).toEqual(['One', 'Two']);
      expect(data.truncated()).toBe(true);
    });

    it('keeps the previous items on screen while a new view loads', async () => {
      data.sceneId.set('scene-1');
      data.view.set(view);
      await settle();
      http
        .expectOne((r) => r.url.includes('/annotations'))
        .flush({ items: [summary('a', 'One')], nextCursor: null });
      await settle();
      expect(data.items().map((i) => i.title)).toEqual(['One']); // the page reads it, so it is live

      data.view.set({ ...view, west: 2.171 });
      await settle();

      expect(data.loading()).toBe(true);
      expect(data.items().map((i) => i.title)).toEqual(['One']);
      listRequests().forEach((r) => r.flush({ items: [summary('b', 'Two')], nextCursor: null }));
      await settle();
      expect(data.items().map((i) => i.title)).toEqual(['Two']);
    });

    it('reload asks again for the same view', async () => {
      data.sceneId.set('scene-1');
      data.view.set(view);
      await settle();
      http.expectOne((r) => r.url.includes('/annotations')).flush({ items: [], nextCursor: null });
      await settle();

      data.reload();
      await settle();

      expect(listRequests()).toHaveLength(1);
    });

    it('reports a failed load', async () => {
      data.sceneId.set('scene-1');
      data.view.set(view);
      await settle();
      http
        .expectOne((r) => r.url.includes('/annotations'))
        .flush({ code: 'SCENE_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(data.failed()).toBe(true);
    });
  });

  describe('create', () => {
    const request = {
      kind: 'MARKER' as const,
      title: 'Cracked window',
      geometry: { type: 'Point' as const, coordinates: [2.175, 41.405] },
    };

    it('posts to the scene and returns the created annotation', async () => {
      const outcome = data.create('scene-1', request);
      const post = await vi.waitFor(() =>
        http.expectOne(
          (r) => r.method === 'POST' && r.url.includes('/api/scenes/scene-1/annotations'),
        ),
      );
      expect(post.request.body).toEqual(request);
      post.flush(summary('new', 'Cracked window'));

      expect(await outcome).toMatchObject({ ok: true, value: { id: 'new' } });
    });

    it('returns the problem the server answered with', async () => {
      const outcome = data.create('scene-1', request);
      const post = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
      post.flush(
        { code: 'TITLE_ALREADY_USED', title: 't', detail: 'd', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );

      expect(await outcome).toEqual({
        ok: false,
        problem: expect.objectContaining({ code: 'TITLE_ALREADY_USED' }),
      });
    });

    it('returns no problem when the network fails', async () => {
      const outcome = data.create('scene-1', request);
      const post = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
      post.error(new ProgressEvent('error'), { status: 0 });

      expect(await outcome).toEqual({ ok: false, problem: undefined });
    });

    it('does not treat a non-problem error body as a problem', async () => {
      const outcome = data.create('scene-1', request);
      const post = await vi.waitFor(() => http.expectOne((r) => r.method === 'POST'));
      post.flush('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' });

      expect(await outcome).toEqual({ ok: false, problem: undefined });
    });
  });
});
