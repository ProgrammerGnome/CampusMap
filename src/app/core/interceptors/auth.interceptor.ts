/**
 * @file Autentikációs HTTP Interceptor.
 * @description Hozzáadja a hitelesítési tokent minden kimenő HTTP kéréshez, és kezeli az illetéktelen (401) válaszokat.
 */
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const token = authStore.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authStore.setSession(null, null);
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};