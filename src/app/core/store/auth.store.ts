import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { User, AuthState } from '../models/auth.model';

function getInitialState(): AuthState {
  const saved = localStorage.getItem('auth_session');
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return { user: null, token: null };
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(getInitialState()),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.token() !== null && store.user() !== null),
  })),
  withMethods((store) => ({
    setSession(user: User | null, token: string | null): void {
      patchState(store, { user, token });
      if (user && token) {
        localStorage.setItem('auth_session', JSON.stringify({ user, token }));
      } else {
        localStorage.removeItem('auth_session');
      }
    },
  }))
);