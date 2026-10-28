import type { Routes } from '@angular/router';

export const SCENE_ROUTES: Routes = [
  {
    path: '',
    title: 'Scene · Twin Atlas',
    loadComponent: () => import('./scene-viewer.page').then((m) => m.SceneViewerPage),
  },
];
