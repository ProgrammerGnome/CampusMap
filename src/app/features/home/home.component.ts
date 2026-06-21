import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import * as L from 'leaflet';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { BuildingService } from '../../core/services/building.service';
import { NotificationService } from '../../core/services/notification.service';
import { Building } from '../../core/models/building.model';
import { AreaFormatPipe } from '../../core/pipes/area-format.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="home-container">
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48" />
          <span>Épületek betöltése...</span>
        </div>
      }
      <div #mapContainer class="map-container"></div>
    </div>
  `,
  styles: [`
    .home-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .map-container {
      width: 100%;
      height: 100%;
    }
    .loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.85);
      gap: 16px;
      font-size: 1rem;
      color: #555;
    }
    :host ::ng-deep .building-popup {
      font-family: inherit;
    }
    :host ::ng-deep .building-popup h3 {
      margin: 0 0 6px;
      font-size: 1rem;
      color: #1565c0;
    }
    :host ::ng-deep .building-popup .popup-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.85rem;
      color: #333;
      margin-bottom: 4px;
    }
    :host ::ng-deep .building-popup .label {
      color: #888;
    }
    :host ::ng-deep .building-popup .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      background: #e3f2fd;
      color: #1565c0;
      margin-top: 6px;
    }
  `],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private readonly buildingService = inject(BuildingService);
  private readonly notification = inject(NotificationService);
  private readonly areaFormatPipe = new AreaFormatPipe();

  readonly loading = signal(true);

  private map!: L.Map;
  private polygonLayers: Map<string, L.Polygon> = new Map();

  ngAfterViewInit(): void {
    this.initMap();
    this.loadBuildings();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [47.498, 19.040],
      zoom: 16,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
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
      .subscribe((buildings) => {
        this.renderBuildings(buildings);
      });
  }

  private renderBuildings(buildings: Building[]): void {
    this.polygonLayers.forEach((layer) => this.map.removeLayer(layer));
    this.polygonLayers.clear();

    if (!buildings.length) return;

    const allLatLngs: L.LatLng[] = [];

    buildings.forEach((building) => {
      if (!building.polygon?.length) return;

      const latLngs = building.polygon.map((p) => L.latLng(p.lat, p.lng));
      allLatLngs.push(...latLngs);

      const polygon = L.polygon(latLngs, {
        color: '#1565c0',
        fillColor: '#42a5f5',
        fillOpacity: 0.35,
        weight: 2,
      });

      const popupHtml = this.buildPopupHtml(building);
      polygon.bindPopup(popupHtml, { maxWidth: 260 });

      polygon.on('mouseover', (e) => {
        (e.target as L.Polygon).setStyle({ fillOpacity: 0.6, weight: 3 });
        polygon.openPopup();
      });
      polygon.on('mouseout', (e) => {
        (e.target as L.Polygon).setStyle({ fillOpacity: 0.35, weight: 2 });
      });

      polygon.addTo(this.map);
      this.polygonLayers.set(building.id, polygon);
    });

    if (allLatLngs.length) {
      this.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [40, 40] });
    }
  }

  private buildPopupHtml(b: Building): string {
    const publicBadge = b.isPublic
      ? '<span class="badge">Nyilvános</span>'
      : '<span class="badge" style="background:#fff3e0;color:#e65100;">Privát</span>';
    return `
      <div class="building-popup">
        <h3>${b.name}</h3>
        <div class="popup-row"><span class="label">Kód:</span><span>${b.code}</span></div>
        <div class="popup-row"><span class="label">Szintek:</span><span>${b.floors}</span></div>
        <div class="popup-row"><span class="label">Terület:</span><span>${this.areaFormatPipe.transform(b.area)}</span></div>
        <div class="popup-row"><span class="label">Leírás:</span></div>
        <div style="font-size:0.82rem;color:#555;margin-bottom:6px">${b.description}</div>
        ${publicBadge}
      </div>
    `;
  }
}
