import { httpResource } from '@angular/common/http';
import { computed, Service, signal } from '@angular/core';
import { listScenesRequest } from '@api/@angular/common.gen';
import {
  type GeoJsonPolygon,
  type ListScenesResponse,
  type SceneResponse,
  createScene,
} from '@api/index';
import { type Outcome, asProblem, failed, succeeded } from '@shared/problems/outcome';

const STORAGE_KEY = 'twinatlas.sceneId';

/**
 * The scenes the user can pick from, and the one picked. The choice is remembered in this browser
 * only. Storage can be unavailable (private window), so every access is guarded.
 */
@Service()
export class SceneData {
  private readonly loaded = httpResource<ListScenesResponse>(() => listScenesRequest());
  /** Scenes created in this session, shown at once, before the list reloads. */
  private readonly created = signal<readonly SceneResponse[]>([]);
  private readonly stored = signal<string | null>(this.read());

  readonly scenes = computed<readonly SceneResponse[]>(() => {
    const fromServer = this.loaded.hasValue() ? this.loaded.value() : [];
    const known = new Set(fromServer.map((scene) => scene.id));
    return [...this.created().filter((scene) => !known.has(scene.id)), ...fromServer];
  });

  readonly loading = computed(() => this.loaded.isLoading());
  readonly failed = computed(() => this.loaded.error() !== undefined);

  /** The stored choice if it still exists, otherwise the newest scene. */
  readonly selectedId = computed(() => {
    const stored = this.stored();
    const scenes = this.scenes();
    if (!this.loaded.hasValue() && scenes.length === 0) return stored; // still loading: trust it
    return scenes.some((scene) => scene.id === stored) ? stored : (scenes[0]?.id ?? null);
  });

  select(id: string | null): void {
    this.stored.set(id);
    this.write(id);
  }

  async create(name: string, extent: GeoJsonPolygon): Promise<Outcome<SceneResponse>> {
    try {
      const result = await createScene({ body: { name, extent } });
      if (!result.data) return failed(asProblem(result.error));
      this.created.update((scenes) => [result.data, ...scenes]);
      this.select(result.data.id);
      this.loaded.reload();
      return succeeded(result.data);
    } catch {
      return failed(undefined);
    }
  }

  private read(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(id: string | null): void {
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable: the choice lasts for this session only
    }
  }
}
