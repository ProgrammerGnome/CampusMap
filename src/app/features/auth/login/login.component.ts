import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="login-header">
            <mat-icon class="login-icon">location_city</mat-icon>
            <h1>Campus Map</h1>
            <p>Térképes épületkezelő rendszer</p>
          </div>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="login()" class="auth-form">
            <mat-form-field appearance="outline">
              <mat-label>Felhasználónév</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              <mat-icon matSuffix>person</mat-icon>
              @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
                <mat-error>A felhasználónév kötelező.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Jelszó</mat-label>
              <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>A jelszó kötelező.</mat-error>
              }
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="auth-btn" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" />
              } @else {
                Bejelentkezés
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #01579b 100%); }
    .login-card { width: 100%; max-width: 420px; border-radius: 12px !important; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important; }
    .login-header { width: 100%; text-align: center; margin-bottom: 24px; }
    .login-icon { font-size: 48px; width: 48px; height: 48px; color: #1565c0; }
    .login-header h1 { margin: 8px 0 4px; font-size: 1.75rem; font-weight: 700; color: #1a1a2e; }
    .login-header p { margin: 0; color: #666; font-size: 0.875rem; }
    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .auth-btn { height: 48px; font-size: 1rem; margin-top: 8px; }
    .auth-btn mat-spinner { margin: auto; }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  login(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { username, password } = this.form.getRawValue();
    this.loading.set(true);
    this.authService.login(username!, password!)
      .pipe(
        catchError((err) => {
          this.notification.error('Hibás felhasználónév vagy jelszó.');
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => {
        this.notification.success('Sikeres bejelentkezés!');
        this.router.navigate(['/']);
      });
  }
}