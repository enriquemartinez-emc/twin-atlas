import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'scenes' },
  {
    path: 'scenes',
    loadChildren: () => import('@features/scene').then((m) => m.SCENE_ROUTES),
  },
  {
    path: '**',
    title: 'Page not found · Twin Atlas',
    loadComponent: () => import('./not-found').then((m) => m.NotFound),
  },
];
