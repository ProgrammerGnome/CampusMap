import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, throwError } from 'rxjs';
import * as L from 'leaflet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    CommonModule, RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule,
    MatChipsModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule, MatTooltipModule,
    AreaFormatPipe, HoverHighlightDirective, DoubleClickEditDirective
  ],
  template: `
    <div class="dashboard-container">
      <div class="map-section">
        @if (loading()) {
          <div class="loading-overlay"><mat-spinner diameter="48" /><span>Adatok betöltése...</span></div>
        }
        <div #mapContainer class="map-container"></div>
      </div>
      <div class="list-section">
        <div class="list-header">
          <h2>Épületek listája</h2>
          <button mat-raised-button color="primary" routerLink="/buildings/new">
            <mat-icon>add</mat-icon> Új épület
          </button>
        </div>
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Keresés (név, kód)</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Név, kód..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-slide-toggle [checked]="buildingStore.showOwnAndPublic()" (change)="buildingStore.setShowOwnAndPublic($event.checked)">
            Saját + Nyilvános
          </mat-slide-toggle>
        </div>
        <div class="buildings-list">
          @if (!filteredBuildings().length && !loading()) {
            <div class="empty-state">
              <mat-icon>domain_disabled</mat-icon>
              <p>Nincs megjeleníthető épület.</p>
            </div>
          }
          @for (building of filteredBuildings(); track building.id) {
            <mat-card
              class="building-card"
              [appHoverHighlight]="buildingStore.highlightedId() === building.id"
              (hovered)="onListHover($event, building.id)"
              (click)="zoomToBuilding(building.id)"
              [appDblClickEdit]="true"
              (dblClickEdit)="handleDblClick(building)"
            >
              <mat-card-header>
                <mat-icon mat-card-avatar>business</mat-icon>
                <mat-card-title>{{ building.name }}</mat-card-title>
                <mat-card-subtitle>{{ building.code }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p class="description">{{ building.description }}</p>
                <div class="stats">
                  <span><mat-icon inline>layers</mat-icon> {{ building.floors }} szint</span>
                  <span><mat-icon inline>straighten</mat-icon> {{ building.area | areaFormat }}</span>
                </div>
              </mat-card-content>
              <mat-card-actions class="card-actions">
                @if (building.isPublic) {
                  <mat-chip class="public-chip">Nyilvános</mat-chip>
                } @else {
                  <mat-chip class="private-chip">Privát</mat-chip>
                }
                <span class="spacer"></span>
                @if (isOwner(building)) {
                  <button mat-icon-button matTooltip="Szerkesztés (Dupla-Katt)" color="primary" (click)="editBuilding(building, $event)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Törlés" color="warn" [disabled]="deletingId() === building.id" (click)="confirmDelete(building, $event)">
                    @if (deletingId() === building.id) { <mat-spinner diameter="20" /> } @else { <mat-icon>delete</mat-icon> }
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container { display: flex; height: 100%; overflow: hidden; }
    .map-section { flex: 2; position: relative; }
    .map-container { width: 100%; height: 100%; }
    .loading-overlay { position: absolute; inset: 0; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); }
    .list-section { flex: 1; min-width: 380px; max-width: 450px; display: flex; flex-direction: column; background: #fff; border-left: 1px solid #e0e0e0; box-shadow: -2px 0 8px rgba(0,0,0,0.05); z-index: 10; }
    .list-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .list-header h2 { margin: 0; font-size: 1.25rem; }
    .filter-bar { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #eee; }
    .search-field { width: 100%; margin-bottom: -16px; }
    .buildings-list { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; background: #f9f9f9; }
    .empty-state { text-align: center; color: #888; padding: 40px 0; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; margin-bottom: 8px; }
    .building-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .building-card.highlighted { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(21,101,192,0.25) !important; border: 1px solid #42a5f5; }
    .description { font-size: 0.85rem; color: #666; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .stats { display: flex; gap: 16px; font-size: 0.85rem; color: #444; }
    .stats span { display: flex; align-items: center; gap: 4px; }
    .card-actions { display: flex; align-items: center; padding: 0 8px 8px; }
    .spacer { flex: 1; }
    .public-chip { background: #e3f2fd !important; color: #1565c0 !important; font-size: 0.75rem; min-height: 24px; padding: 0 10px; }
    .private-chip { background: #fff3e0 !important; color: #e65100 !important; font-size: 0.75rem; min-height: 24px; padding: 0 10px; }
  `]
})
export class BuildingsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  readonly buildingStore = inject(BuildingStore);
  private readonly buildingService = inject(BuildingService);
  private readonly authStore = inject(AuthStore);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly areaFormatPipe = new AreaFormatPipe();

  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);
  readonly searchControl = new FormControl('');

  private map!: L.Map;
  private polygonLayers: Map<string, L.Polygon> = new Map();

  readonly filteredBuildings = computed(() => {
    const search = this.searchControl.value ?? '';
    this.buildingStore.setFilter({ search });
    return this.buildingStore.filteredBuildings();
  });

  constructor() {
    effect(() => {
      const buildings = this.filteredBuildings();
      if (this.map) {
        this.renderBuildings(buildings);
      }
    });

    // Handle highglighting on map when hovering list item
    effect(() => {
      const highlightedId = this.buildingStore.highlightedId();
      this.polygonLayers.forEach((layer, id) => {
        if (id === highlightedId) {
          layer.setStyle({ fillOpacity: 0.7, weight: 4, color: '#0d47a1' });
        } else {
          layer.setStyle({ fillOpacity: 0.35, weight: 2, color: '#1565c0' });
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadBuildings();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.buildingStore.setHighlightedId(null);
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, { center: [47.498, 19.040], zoom: 16 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
    this.renderBuildings(this.filteredBuildings());
  }

  private loadBuildings(): void {
    this.loading.set(true);
    this.buildingService.getAll().pipe(
      catchError((err) => {
        this.notification.error('Nem sikerült betölteni az épületeket.');
        return throwError(() => err);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe();
  }

  private renderBuildings(buildings: Building[]): void {
    if (!this.map) return;
    this.polygonLayers.forEach(layer => this.map.removeLayer(layer));
    this.polygonLayers.clear();

    const allLatLngs: L.LatLng[] = [];

    buildings.forEach((building) => {
      if (!building.polygon?.length) return;
      const latLngs = building.polygon.map(p => L.latLng(p.lat, p.lng));
      allLatLngs.push(...latLngs);

      const polygon = L.polygon(latLngs, { color: '#1565c0', fillColor: '#42a5f5', fillOpacity: 0.35, weight: 2 });
      polygon.bindPopup(`<b>${building.name}</b><br/>${building.code}<br/>${this.areaFormatPipe.transform(building.area)}`);

      polygon.on('mouseover', () => this.buildingStore.setHighlightedId(building.id));
      polygon.on('mouseout', () => this.buildingStore.setHighlightedId(null));
      polygon.on('click', () => {
         this.map.fitBounds(polygon.getBounds(), { padding: [50, 50], maxZoom: 18 });
      });

      polygon.addTo(this.map);
      this.polygonLayers.set(building.id, polygon);
    });

    if (allLatLngs.length && !this.buildingStore.highlightedId()) {
      this.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    }
  }

  onListHover(isHovered: boolean, id: string): void {
    this.buildingStore.setHighlightedId(isHovered ? id : null);
  }

  zoomToBuilding(id: string): void {
    const layer = this.polygonLayers.get(id);
    if (layer) {
      this.map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18 });
      layer.openPopup();
    }
  }

  isOwner(building: Building): boolean {
    return building.userId === this.authStore.user()?.id;
  }

  handleDblClick(building: Building): void {
    if (this.isOwner(building)) {
      this.router.navigate(['/buildings', building.id, 'edit']);
    }
  }

  editBuilding(building: Building, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/buildings', building.id, 'edit']);
  }

  confirmDelete(building: Building, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Épület törlése', message: `Biztosan törli a(z) "${building.name}" épületet?`, confirmText: 'Törlés', confirmColor: 'warn' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteBuilding(building.id);
    });
  }

  private deleteBuilding(id: string): void {
    this.deletingId.set(id);
    this.buildingService.delete(id).pipe(
      catchError((err) => { this.notification.error('Törlés sikertelen.'); return throwError(() => err); }),
      finalize(() => this.deletingId.set(null))
    ).subscribe(() => this.notification.success('Épület sikeresen törölve.'));
  }
}