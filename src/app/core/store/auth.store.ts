import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { User, AuthState } from '../models/auth.model';

const initialState: AuthState = { user: null, token: null };

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialState),
  withComputed((store) => ({
    isAuthenticated: computed(() => store.token() !== null && store.user() !== null),
  })),
  withMethods((store) => ({
    setSession(user: User | null, token: string | null): void {
      patchState(store, { user, token });
    },
  }))
);
