import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/buildings/buildings.component').then((m) => m.BuildingsComponent),
      },
      {
        path: 'buildings/new',
        loadComponent: () => import('./features/buildings/building-form/building-form.component').then((m) => m.BuildingFormComponent),
      },
      {
        path: 'buildings/:id/edit',
        loadComponent: () => import('./features/buildings/building-form/building-form.component').then((m) => m.BuildingFormComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];