import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
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
          <mat-tab-group [(selectedIndex)]="activeTab" class="auth-tabs">
            <!-- Sign In Tab -->
            <mat-tab label="Bejelentkezés">
              <form [formGroup]="signInForm" (ngSubmit)="signIn()" class="auth-form">
                <mat-form-field appearance="outline">
                  <mat-label>E-mail cím</mat-label>
                  <input matInput formControlName="email" type="email" autocomplete="email" />
                  <mat-icon matSuffix>email</mat-icon>
                  @if (signInForm.get('email')?.hasError('required') && signInForm.get('email')?.touched) {
                    <mat-error>Az e-mail cím kötelező.</mat-error>
                  }
                  @if (signInForm.get('email')?.hasError('email') && signInForm.get('email')?.touched) {
                    <mat-error>Érvénytelen e-mail cím.</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Jelszó</mat-label>
                  <input
                    matInput
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                  />
                  <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
                    <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (signInForm.get('password')?.hasError('required') && signInForm.get('password')?.touched) {
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
            </mat-tab>

            <!-- Sign Up Tab -->
            <mat-tab label="Regisztráció">
              <form [formGroup]="signUpForm" (ngSubmit)="signUp()" class="auth-form">
                <mat-form-field appearance="outline">
                  <mat-label>E-mail cím</mat-label>
                  <input matInput formControlName="email" type="email" autocomplete="email" />
                  <mat-icon matSuffix>email</mat-icon>
                  @if (signUpForm.get('email')?.hasError('required') && signUpForm.get('email')?.touched) {
                    <mat-error>Az e-mail cím kötelező.</mat-error>
                  }
                  @if (signUpForm.get('email')?.hasError('email') && signUpForm.get('email')?.touched) {
                    <mat-error>Érvénytelen e-mail cím.</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Jelszó</mat-label>
                  <input
                    matInput
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                  />
                  <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
                    <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (signUpForm.get('password')?.hasError('required') && signUpForm.get('password')?.touched) {
                    <mat-error>A jelszó kötelező.</mat-error>
                  }
                  @if (signUpForm.get('password')?.hasError('minlength') && signUpForm.get('password')?.touched) {
                    <mat-error>A jelszó legalább 6 karakter hosszú legyen.</mat-error>
                  }
                </mat-form-field>

                <button mat-raised-button color="accent" type="submit" class="auth-btn" [disabled]="loading()">
                  @if (loading()) {
                    <mat-spinner diameter="20" />
                  } @else {
                    Regisztráció
                  }
                </button>
              </form>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1565c0 0%, #0d47a1 50%, #01579b 100%);
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
    }
    .login-header {
      width: 100%;
      text-align: center;
      padding: 16px 0 8px;
    }
    .login-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1565c0;
    }
    .login-header h1 {
      margin: 8px 0 4px;
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a1a2e;
    }
    .login-header p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
    .auth-tabs {
      margin-top: 8px;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 20px 0 8px;
    }
    .auth-form mat-form-field {
      width: 100%;
    }
    .auth-btn {
      height: 48px;
      font-size: 1rem;
      margin-top: 8px;
    }
    .auth-btn mat-spinner {
      margin: auto;
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  activeTab = 0;

  readonly signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly signUpForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  signIn(): void {
    if (this.signInForm.invalid) { this.signInForm.markAllAsTouched(); return; }
    const { email, password } = this.signInForm.getRawValue();
    this.loading.set(true);
    this.authService.signIn(email!, password!)
      .pipe(
        catchError((err) => {
          const msg = (err as { message?: string })?.message ?? 'Bejelentkezés sikertelen.';
          this.notification.error(msg);
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => {
        this.notification.success('Sikeres bejelentkezés!');
        this.router.navigate(['/']);
      });
  }

  signUp(): void {
    if (this.signUpForm.invalid) { this.signUpForm.markAllAsTouched(); return; }
    const { email, password } = this.signUpForm.getRawValue();
    this.loading.set(true);
    this.authService.signUp(email!, password!)
      .pipe(
        catchError((err) => {
          const msg = (err as { message?: string })?.message ?? 'Regisztráció sikertelen.';
          this.notification.error(msg);
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => {
        this.notification.success('Sikeres regisztráció! Bejelentkezhet.');
        this.activeTab = 0;
        this.signInForm.patchValue({ email: this.signUpForm.value.email });
        this.signUpForm.reset();
      });
  }
}
