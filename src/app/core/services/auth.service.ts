/**
 * @file Autentikációs szolgáltatás.
 * @description Kezeli a bejelentkezési és kijelentkezési folyamatokat a backend API-val kommunikálva.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  /**
   * Bejelentkezteti a felhasználót a megadott adatokkal.
   * Sikeres bejelentkezés esetén elmenti az eredményt az AuthStore-ba.
   * * @param {string} username - A felhasználónév.
   * @param {string} password - A jelszó.
   * @returns {Observable<{ token: string, user: User }>} A szerver válasza a tokennel és a felhasználóval.
   */
  login(username: string, password: string): Observable<{ token: string, user: User }> {
    return this.http.post<{ token: string, user: User }>('/api/login', { username, password }).pipe(
      tap(res => this.authStore.setSession(res.user, res.token))
    );
  }

  /**
   * Kijelentkezteti a felhasználót a munkamenet törlésével az AuthStore-ból.
   */
  logout(): void {
    this.authStore.setSession(null, null);
  }
}