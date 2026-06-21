import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../services/supabase.client';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return from(supabase.auth.getSession()).pipe(
    map(({ data: { session } }) => {
      if (session) return true;
      return router.createUrlTree(['/login']);
    })
  );
};
