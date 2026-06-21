/**
 * @file Felhasználói munkamenet (autentikáció) állapotkezelője.
 * @description NgRx Signals alapú store, amely a bejelentkezett felhasználót és a tokent tárolja, valamint kezeli a LocalStorage szinkronizációt.
 */
import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { User, AuthState } from '../models/auth.model';

/**
 * Visszaadja a kezdeti autentikációs állapotot a LocalStorage alapján.
 * Ha létezik elmentett munkamenet, visszatölti azt (Rehydration).
 * * @returns {AuthState} A felhasználói állapot objektum.
 */
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
    /**
     * Számított érték, amely jelzi, hogy a felhasználó be van-e jelentkezve.
     * * @returns {boolean} Igaz, ha van érvényes token és felhasználó.
     */
    isAuthenticated: computed(() => store.token() !== null && store.user() !== null),
  })),
  withMethods((store) => ({
    /**
     * Beállítja az aktuális felhasználói munkamenetet a store-ban és a LocalStorage-ban.
     * Kijelentkezés esetén null értékkel kell meghívni.
     * * @param {User | null} user - A bejelentkezett felhasználó adatai, vagy null.
     * @param {string | null} token - A hitelesítési token, vagy null.
     */
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