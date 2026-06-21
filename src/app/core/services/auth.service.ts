import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { User } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authStore = inject(AuthStore);

  login(username: string, password: string): Observable<{ token: string, user: User }> {
    return this.http.post<{ token: string, user: User }>('/api/login', { username, password }).pipe(
      tap(res => this.authStore.setSession(res.user, res.token))
    );
  }

  logout(): void {
    this.authStore.setSession(null, null);
  }
}