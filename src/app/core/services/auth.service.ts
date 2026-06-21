import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.client';
import { AuthStore } from '../store/auth.store';
import { User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authStore = inject(AuthStore);

  constructor() {
    // Restore session on app startup (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      this.syncSession(session);
    });

    // Keep store in sync with Supabase auth events
    supabase.auth.onAuthStateChange((_event, session) => {
      (() => { this.syncSession(session); })();
    });
  }

  private syncSession(session: Session | null): void {
    if (session) {
      const user: User = { id: session.user.id, email: session.user.email ?? '' };
      this.authStore.setSession(user, session.access_token);
    } else {
      this.authStore.setSession(null, null);
    }
  }

  signIn(email: string, password: string): Observable<User> {
    return from(supabase.auth.signInWithPassword({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { id: data.user!.id, email: data.user!.email! };
      })
    );
  }

  signUp(email: string, password: string): Observable<User> {
    return from(supabase.auth.signUp({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return { id: data.user!.id, email: data.user!.email! };
      })
    );
  }

  signOut(): Observable<void> {
    return from(supabase.auth.signOut()).pipe(
      tap(() => this.authStore.setSession(null, null)),
      map(({ error }) => { if (error) throw error; })
    );
  }
}
