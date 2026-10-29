import { computed, inject, signal, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { problemMessage } from '@app/core/problems/problem-message';
import { type Bbox } from '@map/bbox';
import { bboxPolygon } from '@map/geojson';
import { SceneData } from './scene-data';

/** Creates a scene that covers what the map shows, then opens it. */
export function sceneCreation(view: Signal<Bbox | null>) {
  const router = inject(Router);
  const scenes = inject(SceneData);
  const busy = signal(false);
  const problem = signal<string | null>(null);
  /** A scene is built from the visible area, so the map must have reported one. */
  const canCreate = computed(() => !!view());

  async function create(name: string): Promise<void> {
    const box = view();
    if (!box) return;
    if (box.west > box.east) {
      problem.set('The view crosses the date line. Move the map and try again.');
      return;
    }
    busy.set(true);
    problem.set(null);
    const outcome = await scenes.create(name, bboxPolygon(box));
    busy.set(false);
    if (outcome.ok) void router.navigate(['/scenes', outcome.value.id]);
    else problem.set(problemMessage(outcome.problem));
  }

  return { busy, problem, canCreate, create };
}
