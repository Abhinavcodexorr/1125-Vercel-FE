import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'categories/new',
        loadComponent: () =>
          import('./features/categories/category-form.component').then((m) => m.CategoryFormComponent),
      },
      {
        path: 'categories/:id/edit',
        loadComponent: () =>
          import('./features/categories/category-form.component').then((m) => m.CategoryFormComponent),
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./features/rooms/rooms.component').then((m) => m.RoomsComponent),
      },
      {
        path: 'rooms/new',
        loadComponent: () =>
          import('./features/rooms/room-form.component').then((m) => m.RoomFormComponent),
      },
      {
        path: 'rooms/:id/edit',
        loadComponent: () =>
          import('./features/rooms/room-form.component').then((m) => m.RoomFormComponent),
      },
      { path: 'bookings', redirectTo: 'bookings/incomplete', pathMatch: 'full' },
      {
        path: 'bookings/:section',
        loadComponent: () =>
          import('./features/bookings/bookings.component').then((m) => m.BookingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
