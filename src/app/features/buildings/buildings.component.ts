import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, finalize, throwError } from 'rxjs';
import { BuildingService } from '../../core/services/building.service';
import { BuildingStore } from '../../core/store/building.store';
import { AuthStore } from '../../core/store/auth.store';
import { NotificationService } from '../../core/services/notification.service';
import { Building } from '../../core/models/building.model';
import { AreaFormatPipe } from '../../core/pipes/area-format.pipe';
import { HoverHighlightDirective } from '../../core/directives/hover-highlight.directive';
import { DoubleClickEditDirective } from '../../core/directives/double-click-edit.directive';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-buildings',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    AreaFormatPipe,
    HoverHighlightDirective,
    DoubleClickEditDirective,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <mat-icon>business</mat-icon>
            Épületek
          </h1>
          <p class="page-subtitle">Kampusz épületeinek kezelése</p>
        </div>
        <div class="header-actions">
          <mat-slide-toggle
            [checked]="buildingStore.showOwnAndPublic()"
            (change)="buildingStore.setShowOwnAndPublic($event.checked)"
          >
            Saját + Nyilvános
          </mat-slide-toggle>
          <button mat-raised-button color="primary" routerLink="/buildings/new">
            <mat-icon>add</mat-icon>
            Új épület
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Keresés</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Név, kód, leírás..." />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40" />
          <span>Betöltés...</span>
        </div>
      } @else if (!filteredBuildings().length) {
        <div class="empty-state">
          <mat-icon>domain_disabled</mat-icon>
          <h3>Nincsenek épületek</h3>
          <p>Hozzon létre egy új épületet a gombbal fent.</p>
          <button mat-raised-button color="primary" routerLink="/buildings/new">
            <mat-icon>add</mat-icon>
            Új épület létrehozása
          </button>
        </div>
      } @else {
        <div class="buildings-grid">
          @for (building of filteredBuildings(); track building.id) {
            <mat-card
              class="building-card"
              [appHoverHighlight]="highlightedId() === building.id"
              (hovered)="highlightedId.set($event ? building.id : null)"
              [appDblClickEdit]="true"
              (dblClickEdit)="editBuilding(building)"
            >
              <mat-card-header>
                <mat-icon mat-card-avatar>business</mat-icon>
                <mat-card-title>{{ building.name }}</mat-card-title>
                <mat-card-subtitle>{{ building.code }}</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content class="card-content">
                <p class="description">{{ building.description }}</p>
                <div class="stats-grid">
                  <div class="stat">
                    <span class="stat-label">Szintek</span>
                    <span class="stat-value">{{ building.floors }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Terület</span>
                    <span class="stat-value">{{ building.area | areaFormat }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Pontok</span>
                    <span class="stat-value">{{ building.polygon.length }}</span>
                  </div>
                </div>
                @if (building.isPublic) {
                  <mat-chip class="public-chip" color="primary">
                    <mat-icon>public</mat-icon>
                    Nyilvános
                  </mat-chip>
                } @else {
                  <mat-chip class="private-chip">
                    <mat-icon>lock</mat-icon>
                    Privát
                  </mat-chip>
                }
              </mat-card-content>

              <mat-card-actions class="card-actions">
                @if (isOwner(building)) {
                  <button
                    mat-icon-button
                    matTooltip="Szerkesztés"
                    color="primary"
                    (click)="editBuilding(building)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    matTooltip="Törlés"
                    color="warn"
                    [disabled]="deletingId() === building.id"
                    (click)="confirmDelete(building)"
                  >
                    @if (deletingId() === building.id) {
                      <mat-spinner diameter="20" />
                    } @else {
                      <mat-icon>delete</mat-icon>
                    }
                  </button>
                } @else {
                  <span class="not-owner-hint">Csak megtekinthető</span>
                }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 4px;
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a1a2e;
    }
    .page-subtitle {
      margin: 0;
      color: #666;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .filter-bar {
      margin-bottom: 24px;
    }
    .search-field {
      width: 100%;
      max-width: 400px;
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
      gap: 16px;
      color: #888;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 24px;
      text-align: center;
      color: #888;
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.4;
    }
    .empty-state h3 { color: #555; margin-bottom: 8px; }
    .empty-state p { margin-bottom: 24px; }
    .buildings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .building-card {
      border-radius: 12px !important;
      transition: box-shadow 0.2s, transform 0.2s;
      cursor: pointer;
    }
    .building-card:hover, .building-card.highlighted {
      box-shadow: 0 8px 24px rgba(21,101,192,0.2) !important;
      transform: translateY(-2px);
    }
    .card-content {
      padding-bottom: 8px !important;
    }
    .description {
      font-size: 0.875rem;
      color: #555;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 8px;
    }
    .stat-label {
      font-size: 0.7rem;
      color: #888;
      text-transform: uppercase;
    }
    .stat-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1565c0;
    }
    .public-chip {
      --mdc-chip-label-text-color: #1565c0;
      background: #e3f2fd !important;
    }
    .private-chip {
      background: #fff3e0 !important;
      --mdc-chip-label-text-color: #e65100;
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
      padding: 8px 16px;
    }
    .not-owner-hint {
      font-size: 0.75rem;
      color: #aaa;
      font-style: italic;
    }
  `],
})
export class BuildingsComponent {
  readonly buildingStore = inject(BuildingStore);
  private readonly buildingService = inject(BuildingService);
  private readonly authStore = inject(AuthStore);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly highlightedId = signal<string | null>(null);

  readonly searchControl = new FormControl('');

  readonly filteredBuildings = computed(() => {
    const search = this.searchControl.value ?? '';
    const buildings = this.buildingStore.filteredBuildings();
    if (!search) return buildings;
    const q = search.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.loadBuildings();
  }

  private loadBuildings(): void {
    this.loading.set(true);
    this.buildingService
      .getAll()
      .pipe(
        catchError((err) => {
          this.notification.error('Nem sikerült betölteni az épületeket.');
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  isOwner(building: Building): boolean {
    return building.userId === this.authStore.user()?.id;
  }

  editBuilding(building: Building): void {
    this.router.navigate(['/buildings', building.id, 'edit']);
  }

  confirmDelete(building: Building): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Épület törlése',
        message: `Biztosan törli a(z) "${building.name}" épületet? Ez a művelet nem visszafordítható.`,
        confirmText: 'Törlés',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteBuilding(building.id);
    });
  }

  private deleteBuilding(id: string): void {
    this.deletingId.set(id);
    this.buildingService
      .delete(id)
      .pipe(
        catchError((err) => {
          this.notification.error('Törlés sikertelen.');
          return throwError(() => err);
        }),
        finalize(() => this.deletingId.set(null))
      )
      .subscribe(() => {
        this.notification.success('Épület sikeresen törölve.');
      });
  }
}
