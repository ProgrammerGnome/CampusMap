/**
 * @file Épületek főképernyőjének komponense.
 * @description Tartalmazza a térképes és a listás nézetet, valamint kezeli az épületek szűrését és a kétirányú interakciókat (hover, zoom, törlés, szerkesztés).
 */
import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, effect, signal } from '@angular/core';
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
          <h2>Épületek</h2>
          <button mat-raised-button color="primary" routerLink="/buildings/new">
            <mat-icon>add</mat-icon> Új épület
          </button>
        </div>
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Keresés</mat-label>
            <input matInput [formControl]="searchControl" placeholder="Név, kód..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-slide-toggle [checked]="buildingStore.showOwnAndPublic()" (change)="buildingStore.setShowOwnAndPublic($event.checked)">
            Saját + Nyilvános épületek
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
                  <button mat-icon-button matTooltip="Szerkesztés" color="primary" (click)="editBuilding(building, $event)">
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
    .dashboard-container { display: flex; height: 100%; width: 100%; overflow: hidden; }
    .map-section { flex: 2; position: relative; height: 100%; }
    .map-container { width: 100%; height: 100%; }
    .loading-overlay { position: absolute; inset: 0; z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); }
    .list-section { flex: 1; min-width: 380px; max-width: 450px; display: flex; flex-direction: column; background: #fff; border-left: 1px solid #e0e0e0; box-shadow: -2px 0 8px rgba(0,0,0,0.05); z-index: 10; height: 100%; }
    .list-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .list-header h2 { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .filter-bar { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #eee; }
    .search-field { width: 100%; }
    .buildings-list { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; background: #f9f9f9; }
    .empty-state { text-align: center; color: #888; padding: 40px 0; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.5; margin-bottom: 8px; }
    .building-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; border: 1px solid transparent; }
    .building-card:hover, .building-card.highlighted { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(21,101,192,0.2) !important; border: 1px solid #42a5f5; }
    .description { font-size: 0.85rem; color: #666; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .stats { display: flex; gap: 16px; font-size: 0.85rem; color: #444; }
    .stats span { display: flex; align-items: center; gap: 4px; }
    .card-actions { display: flex; align-items: center; padding: 8px 16px; }
    .spacer { flex: 1; }
    .public-chip { background: #e3f2fd !important; color: #1565c0 !important; font-size: 0.75rem; }
    .private-chip { background: #fff3e0 !important; color: #e65100 !important; font-size: 0.75rem; }
  `]
})
export class BuildingsComponent implements OnInit, AfterViewInit, OnDestroy {
  /** A térkép HTML konténerének referenciája. */
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  /** Globális épület állapotkezelő. */
  readonly buildingStore = inject(BuildingStore);
  
  private readonly buildingService = inject(BuildingService);
  private readonly authStore = inject(AuthStore);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly areaFormatPipe = new AreaFormatPipe();

  /** Betöltési állapotot jelző szignál. */
  readonly loading = signal(true);
  
  /** Az éppen törlés alatt álló épület azonosítóját tároló szignál. */
  readonly deletingId = signal<string | null>(null);
  
  /** A keresőmező űrlapvezérlője. */
  readonly searchControl = new FormControl('');

  /** A Leaflet térképpéldány. */
  private map!: L.Map;
  
  /** Az épületekhez tartozó poligon rétegek nyilvántartása, azonosító (ID) alapján. */
  private polygonLayers: Map<string, L.Polygon> = new Map();

  /** A szűrt épületek listáját visszaadó számított szignál a Store-ból. */
  readonly filteredBuildings = this.buildingStore.filteredBuildings;

  /**
   * A komponens konstruktora.
   * Inicializálja a keresőmező figyelését és a térkép szinkronizációját a listával.
   */
  constructor() {
    this.searchControl.valueChanges.subscribe((value) => {
      this.buildingStore.setFilter({ search: value ?? '' });
    });

    // 2. Térkép szinkronizálása a szűrt listával (KIZÁRÓLAG akkor fut le, ha a buildings tömb darabszáma vagy elemei változnak)
    effect(() => {
      const buildings = this.filteredBuildings();
      if (this.map) {
        // Az untracked megakadályozza, hogy a store egyéb változásai (mint a selectedId) újrarenderelést váltsanak ki
        this.renderBuildings(buildings);
      }
    });

    // 3. Hover kiemelés ÉS kattintás alapú stíluskezelés a térképen (Nem törli a rétegeket, csak a meglévő poligonok színét módosítja!)
    effect(() => {
      const highlightedId = this.buildingStore.highlightedId();
      const selectedId = this.buildingStore.selectedId();

      this.polygonLayers.forEach((layer, id) => {
        if (id === selectedId) {
          // A rákattintott, aktív épület vastag arany/kék kiemelést kap
          layer.setStyle({ fillOpacity: 0.7, weight: 4, color: '#ff9800' });
        } else if (id === highlightedId) {
          // Az éppen hoverelt épület sötétkék lesz
          layer.setStyle({ fillOpacity: 0.6, weight: 3, color: '#0d47a1' });
        } else {
          // Az alapértelmezett, érintetlen poligonok stílusa
          layer.setStyle({ fillOpacity: 0.35, weight: 2, color: '#1565c0' });
        }
      });
    });
  }

  /**
   * Életciklus horog: A komponens inicializálásakor lefutó metódus.
   * Elindítja az épületek betöltését a szerverről.
   */
  ngOnInit(): void {
    this.loadBuildings();
  }

  /**
   * Életciklus horog: A nézet inicializálása után lefutó metódus.
   * Létrehozza és beállítja a Leaflet térképet.
   */
  ngAfterViewInit(): void {
    this.initMap();
  }

  /**
   * Életciklus horog: A komponens megsemmisítésekor lefutó metódus.
   * Eltávolítja a térképet a memóriaszivárgás elkerülése érdekében.
   */
  ngOnDestroy(): void {
    this.map?.remove();
    this.buildingStore.setHighlightedId(null);
  }

  /**
   * Inicializálja a Leaflet térképet az alapértelmezett beállításokkal.
   */
  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, { center: [47.498, 19.040], zoom: 16 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
      maxZoom: 19,
      crossOrigin: true // Megj.: ez engedélyezi a biztonságos cross-origin képbetöltést.
    }).addTo(this.map);
    this.renderBuildings(this.filteredBuildings());
  }

  /**
   * Betölti az épületeket a szolgáltatáson keresztül, és kezeli a betöltési állapotot.
   */
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

  /**
   * Kirajzolja a megadott épületek poligonjait a térképre, és rájuk köti az eseménykezelőket.
   * * @param {Building[]} buildings - A kirajzolandó épületek listája.
   */
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

      // Egér rávitelekor kiemeljük a bolgont a store-ban ÉS azonnal megnyitjuk a hozzá tartozó popup ablakot
      polygon.on('mouseover', () => {
        this.buildingStore.setHighlightedId(building.id);
        polygon.openPopup();
      });
      // Egér elvitelekor töröljük a kiemelést ÉS bezárjuk a felugró ablakot
      polygon.on('mouseout', () => {
        this.buildingStore.setHighlightedId(null);
        polygon.closePopup();
      });
      // Kattintáskor fixen ráfókuszálunk az épületre (így a popup nyitva marad, amíg máshova nem kattintunk)
      polygon.on('click', () => this.zoomToBuilding(building.id));

      polygon.addTo(this.map);
      this.polygonLayers.set(building.id, polygon);
    });

    if (allLatLngs.length && !this.buildingStore.highlightedId() && !this.buildingStore.selectedId()) {
      this.map.fitBounds(L.latLngBounds(allLatLngs), { 
        padding: [40, 40],
        animate: false 
      });
    }
  }

  /**
   * Kezeli a listaelemek feletti egerészést (hover), és frissíti a kiemelt épület azonosítóját a store-ban.
   * * @param {boolean} isHovered - Igaz, ha az egér a listaelem felett van, egyébként hamis.
   * @param {string} id - A listaelemhez tartozó épület azonosítója.
   */
  onListHover(isHovered: boolean, id: string): void {
    this.buildingStore.setHighlightedId(isHovered ? id : null);
  }

  /**
   * Rázoomol a megadott épületre a térképen, és megnyitja a hozzá tartozó felugró ablakot (popup).
   * * @param {string} id - Az épület azonosítója, amelyre a térkép fókuszál.
   */
  zoomToBuilding(id: string): void {
    // Elmentjük a kijelölést, így a stílus-effect azonnal kiszínezi a kiválasztott poligont
    this.buildingStore.selectBuilding(id);
    
    const layer = this.polygonLayers.get(id);
    if (layer) {
      this.map.fitBounds(layer.getBounds(), { 
        padding: [50, 50], 
        maxZoom: 18,
        animate: false // Letiltja a Leaflet belső, egymásba akadó animációs remegését
      });
      layer.openPopup();
    }
  }

  /**
   * Ellenőrzi, hogy a bejelentkezett felhasználó-e az adott épület tulajdonosa.
   * * @param {Building} building - A vizsgálandó épület.
   * @returns {boolean} Igaz, ha a felhasználó a tulajdonos, egyébként hamis.
   */
  isOwner(building: Building): boolean {
    return building.userId === this.authStore.user()?.id;
  }

  /**
   * Kezeli a dupla kattintást egy épület kártyáján. Ha a felhasználó a tulajdonos, megnyitja a szerkesztő nézetet.
   * * @param {Building} building - A szerkesztendő épület.
   */
  handleDblClick(building: Building): void {
    if (this.isOwner(building)) {
      this.router.navigate(['/buildings', building.id, 'edit']);
    }
  }

  /**
   * Átirányít a megadott épület szerkesztési oldalára.
   * * @param {Building} building - A szerkesztendő épület.
   * @param {Event} event - A kattintási esemény objektum.
   */
  editBuilding(building: Building, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/buildings', building.id, 'edit']);
  }

  /**
   * Törlési megerősítő párbeszédablakot nyit meg a megadott épülethez.
   * * @param {Building} building - A törlendő épület.
   * @param {Event} event - A kattintási esemény objektum.
   */
  confirmDelete(building: Building, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Épület törlése', message: `Biztosan törli a(z) "${building.name}" épületet?`, confirmText: 'Törlés', confirmColor: 'warn' }
    });
    ref.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteBuilding(building.id);
    });
  }

  /**
   * Végrehajtja egy épület törlését az adatbázisból, és kezeli a betöltési/hiba állapotokat.
   * * @param {string} id - A törlendő épület azonosítója.
   */
  private deleteBuilding(id: string): void {
    this.deletingId.set(id);
    this.buildingService.delete(id).pipe(
      catchError((err) => { this.notification.error('Törlés sikertelen.'); return throwError(() => err); }),
      finalize(() => this.deletingId.set(null))
    ).subscribe(() => this.notification.success('Épület sikeresen törölve.'));
  }
}