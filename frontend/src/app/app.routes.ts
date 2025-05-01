import { Routes } from '@angular/router';
import { authGuard } from '@guards/auth.guard';
import { redirectGuard } from '@guards/redirect.guard';

export const routes: Routes = [
  // pathMatch: 'full' is used to redirect the user to the login page if the path is empty
  // and the user is not authenticated
  // pathMatch: 'prefix' is used to redirect the user to the login page if the path is not empty
  // and the user is not authenticated
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [redirectGuard],
    loadComponent: () => import('./modules/auth/pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./modules/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Forgot your password?'
  },
  {
    path: 'register',
    loadComponent: () => import('./modules/auth/pages/register/register.component').then(m => m.RegisterComponent),
    title: 'Register'
  },
  {
    path: 'recovery',
    loadComponent: () => import('./modules/auth/pages/recovery/recovery.component').then(m => m.RecoveryComponent),
    title: 'Recover Password'
  },
  {
    path: 'app',
    loadComponent: () => import('./modules/layout/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'boards',
        pathMatch: 'full',
      },
      {
        path: 'boards',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/boards/pages/boards/boards.component').then(m => m.BoardsComponent),
        title: 'Dashboards'
      },
      {
        path: 'boards/:boardId',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/boards/pages/board/board.component').then(m => m.BoardComponent),
        title: 'Particular Dashboard'
      },
      {
        path: 'scroll',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/shared/users/pages/scroll/scroll.component').then(m => m.ScrollComponent),
        title: 'Virtual scrolling'
      },
      {
        path: 'users',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/shared/users/pages/users-table/users-table.component').then(m => m.UsersTableComponent),
        title: 'Users'
      },
    ],
  },
];
