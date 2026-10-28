import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'scene' },
  {
    path: 'scene',
    loadChildren: () => import('@features/scene/public-api').then((m) => m.SCENE_ROUTES),
  },
];
