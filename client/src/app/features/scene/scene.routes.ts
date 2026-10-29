import type { Routes } from '@angular/router';

export const SCENE_ROUTES: Routes = [
  {
    path: '',
    title: 'Scene · Twin Atlas',
    loadComponent: () => import('./scene').then((m) => m.Scene),
  },
];
