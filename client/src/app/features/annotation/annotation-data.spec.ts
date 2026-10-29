import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { client } from '@api/client.gen';
import type { Bbox } from '@map/public-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AnnotationData, annotationData } from './annotation-data';

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

describe('annotationData', () => {
  let sceneId: WritableSignal<string | null>;
  let visible: WritableSignal<Bbox | null>;
  let selectedId: WritableSignal<string | null>;
  let data: AnnotationData;
  let http: HttpTestingController;

  const listRequests = () => http.match((r) => r.url.includes('/annotations'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client.setConfig({ httpClient: TestBed.inject(HttpClient), baseUrl: '' });
    sceneId = signal<string | null>(null);
    visible = signal<Bbox | null>(null);
    selectedId = signal<string | null>(null);
    data = TestBed.runInInjectionContext(() => annotationData(sceneId, visible, selectedId));
    http = TestBed.inject(HttpTestingController);
  });

  describe('loading the view', () => {
    it('does not call the server until there is a scene and a view', async () => {
      await settle();
      expect(listRequests()).toHaveLength(0);

      sceneId.set('scene-1');
      await settle();
      expect(listRequests()).toHaveLength(0);

      visible.set(view);
      await settle();
      expect(listRequests()).toHaveLength(1);
    });

    it('asks for the scene, the visible bbox and one page', async () => {
      sceneId.set('scene-1');
      visible.set(view);
      await settle();

      const request = http.expectOne((r) => r.url.includes('/api/scenes/scene-1/annotations'));

      expect(request.request.method).toBe('GET');
      const query = new URL(request.request.urlWithParams, 'http://localhost').searchParams;
      expect(query.get('bbox')).toBe('2.17,41.4,2.18,41.41');
      expect(query.get('limit')).toBe('200');
      request.flush({ items: [], nextCursor: null });
    });

    it('exposes the items and whether the page was cut off', async () => {
      sceneId.set('scene-1');
      visible.set(view);
      await settle();
      http
        .expectOne((r) => r.url.includes('/annotations'))
        .flush({ items: [summary('a', 'One'), summary('b', 'Two')], nextCursor: 'more' });
      await settle();

      expect(data.items().map((i) => i.title)).toEqual(['One', 'Two']);
      expect(data.truncated()).toBe(true);
    });

    it('keeps the previous items on screen while a new view loads', async () => {
      sceneId.set('scene-1');
      visible.set(view);
      await settle();
      http
        .expectOne((r) => r.url.includes('/annotations'))
        .flush({ items: [summary('a', 'One')], nextCursor: null });
      await settle();
      expect(data.items().map((i) => i.title)).toEqual(['One']); // the page reads it, so it is live

      visible.set({ ...view, west: 2.171 });
      await settle();

      expect(data.loading()).toBe(true);
      expect(data.items().map((i) => i.title)).toEqual(['One']);
      listRequests().forEach((r) => r.flush({ items: [summary('b', 'Two')], nextCursor: null }));
      await settle();
      expect(data.items().map((i) => i.title)).toEqual(['Two']);
    });

    it('reload asks again for the same view', async () => {
      sceneId.set('scene-1');
      visible.set(view);
      await settle();
      http.expectOne((r) => r.url.includes('/annotations')).flush({ items: [], nextCursor: null });
      await settle();

      data.reload();
      await settle();

      expect(listRequests()).toHaveLength(1);
    });

    it('reports a failed load', async () => {
      sceneId.set('scene-1');
      visible.set(view);
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

  describe('one annotation and its ETag', () => {
    const detail = (id: string, etag = '"4"') => ({
      body: { ...summary(id, 'Cracked window'), body: null },
      headers: { ETag: etag },
    });
    const detailRequests = () =>
      http.match((r) => r.method === 'GET' && /\/annotations\/[^/?]+$/.test(r.url));

    it('loads nothing until an annotation is selected', async () => {
      sceneId.set('scene-1');
      await settle();

      expect(detailRequests()).toHaveLength(0);
      expect(data.current()).toBeNull();
    });

    it('loads the selected annotation and keeps its ETag', async () => {
      sceneId.set('scene-1');
      selectedId.set('a1');
      await settle();

      const [request] = detailRequests();
      expect(request?.request.url).toContain('/api/scenes/scene-1/annotations/a1');
      request?.flush(detail('a1').body, { headers: detail('a1').headers });
      await settle();

      expect(data.current()).toMatchObject({ id: 'a1', title: 'Cracked window' });
      expect(data.etag()).toBe('"4"');
    });

    it('drops the old annotation and its ETag when another is selected', async () => {
      sceneId.set('scene-1');
      selectedId.set('a1');
      await settle();
      detailRequests()[0]?.flush(detail('a1').body, { headers: detail('a1').headers });
      await settle();
      expect(data.current()?.id).toBe('a1');

      selectedId.set('a2');
      await settle();

      expect(data.current()).toBeNull(); // never show a1 while a2 loads
      detailRequests().forEach((r) => r.flush(detail('a2').body, { headers: { ETag: '"9"' } }));
      await settle();
      expect(data.etag()).toBe('"9"');
    });

    it('reloadDetail reads the annotation again', async () => {
      sceneId.set('scene-1');
      selectedId.set('a1');
      await settle();
      detailRequests()[0]?.flush(detail('a1').body, { headers: detail('a1').headers });
      await settle();

      data.reloadDetail();
      await settle();

      expect(detailRequests()).toHaveLength(1);
    });

    it('reports a detail that cannot be loaded', async () => {
      sceneId.set('scene-1');
      selectedId.set('gone');
      await settle();

      detailRequests()[0]?.flush(
        { code: 'ANNOTATION_NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      );
      await settle();

      expect(data.detailFailed()).toBe(true);
    });

    describe('update', () => {
      const select = async () => {
        sceneId.set('scene-1');
        selectedId.set('a1');
        await settle();
        detailRequests()[0]?.flush(detail('a1').body, { headers: detail('a1').headers });
        await settle();
      };

      it('sends the changes with the ETag it read as If-Match', async () => {
        await select();

        const outcome = data.update({ title: 'Loose tile' });
        const patch = await vi.waitFor(() => http.expectOne((r) => r.method === 'PATCH'));
        expect(patch.request.url).toContain('/api/scenes/scene-1/annotations/a1');
        expect(patch.request.headers.get('If-Match')).toBe('"4"');
        expect(patch.request.body).toEqual({ title: 'Loose tile' });
        patch.flush({ ...summary('a1', 'Loose tile'), body: null }, { headers: { ETag: '"5"' } });

        expect(await outcome).toMatchObject({ ok: true, value: { title: 'Loose tile' } });
      });

      it('returns the problem when the version is stale', async () => {
        await select();

        const outcome = data.update({ title: 'Loose tile' });
        const patch = await vi.waitFor(() => http.expectOne((r) => r.method === 'PATCH'));
        patch.flush(
          { code: 'STALE_VERSION', title: 't', detail: 'd', status: 412 },
          { status: 412, statusText: 'Precondition Failed' },
        );

        expect(await outcome).toEqual({
          ok: false,
          problem: expect.objectContaining({ code: 'STALE_VERSION' }),
        });
      });

      it('returns no problem when the network fails', async () => {
        await select();

        const outcome = data.update({ title: 'Loose tile' });
        const patch = await vi.waitFor(() => http.expectOne((r) => r.method === 'PATCH'));
        patch.error(new ProgressEvent('error'), { status: 0 });

        expect(await outcome).toEqual({ ok: false, problem: undefined });
      });

      it('does not call the server without a version, and says a version is required', async () => {
        sceneId.set('scene-1');
        selectedId.set('a1'); // the annotation has not loaded, so there is no ETag
        await settle();

        const outcome = await data.update({ title: 'Loose tile' });

        expect(outcome).toEqual({
          ok: false,
          problem: expect.objectContaining({ code: 'PRECONDITION_REQUIRED' }),
        });
        expect(http.match((r) => r.method === 'PATCH')).toHaveLength(0);
        detailRequests().forEach((r) =>
          r.flush(detail('a1').body, { headers: detail('a1').headers }),
        );
      });
    });
  });
});
