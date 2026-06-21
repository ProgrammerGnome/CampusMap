import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/store/auth.store';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <div class="toolbar-brand">
        <mat-icon>location_city</mat-icon>
        <span class="brand-name">Campus Map</span>
      </div>
      <nav class="toolbar-nav">
        <a
          mat-button
          routerLink="/"
          routerLinkActive="nav-active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          <mat-icon>map</mat-icon>
          Térkép
        </a>
        <a mat-button routerLink="/buildings" routerLinkActive="nav-active">
          <mat-icon>business</mat-icon>
          Épületek
        </a>
      </nav>
      <span class="spacer"></span>
      <div class="toolbar-user">
        <span class="username">{{ authStore.user()?.email }}</span>
        <button
          mat-icon-button
          matTooltip="Kijelentkezés"
          (click)="logout()"
        >
          <mat-icon>logout</mat-icon>
        </button>
      </div>
    </mat-toolbar>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      gap: 8px;
    }
    .toolbar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-name {
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .toolbar-nav {
      display: flex;
      margin-left: 24px;
      gap: 4px;
    }
    .toolbar-nav a {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nav-active {
      background: rgba(255,255,255,0.15) !important;
      border-radius: 4px;
    }
    .spacer { flex: 1; }
    .toolbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .username {
      font-size: 0.875rem;
      opacity: 0.85;
    }
    .content {
      margin-top: 64px;
      height: calc(100vh - 64px);
    }
  `],
})
export class ShellComponent {
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
