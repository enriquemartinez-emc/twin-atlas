import type { Routes, UrlMatchResult, UrlSegment } from '@angular/router';

/**
 * `/scenes` and `/scenes/:sceneId` are one route with an optional parameter, so choosing another
 * scene reuses the page and its map instead of building them again.
 */
export function sceneUrl(segments: UrlSegment[]): UrlMatchResult | null {
  const [sceneId, ...rest] = segments;
  if (rest.length > 0) return null;
  return { consumed: segments, posParams: sceneId ? { sceneId } : {} };
}

export const SCENE_ROUTES: Routes = [
  {
    matcher: sceneUrl,
    title: 'Scenes · Twin Atlas',
    loadComponent: () => import('./scene').then((m) => m.Scene),
  },
];
