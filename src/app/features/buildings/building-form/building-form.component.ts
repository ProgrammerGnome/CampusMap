/**
 * @file Épület létrehozására és szerkesztésére szolgáló űrlap komponens.
 * @description Kezeli a validációs logikát és a térképen történő poligon rajzolást, beleértve a visszavonás (undo/redo) funkciókat.
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import 'leaflet-draw';
import { catchError, finalize, throwError } from 'rxjs';
import { BuildingService } from '../../../core/services/building.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Building, BuildingCreate, LatLng } from '../../../core/models/building.model';

/**
 * Egyedi validátor, amely ellenőrzi, hogy a FormArray tartalmaz-e egy megadott minimum számú pontot.
 * * @param {number} min - A szükséges minimális pontok száma.
 * @returns {ValidationErrors | null} Validációs hibaobjektum, ha a feltétel nem teljesül, egyébként null.
 */
function minPolygonPoints(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    return arr.length >= min ? null : { minPoints: { required: min, actual: arr.length } };
  };
}

@Component({
  selector: 'app-building-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="form-page">
      <div class="form-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="page-title">{{ isEdit ? 'Épület szerkesztése' : 'Új épület' }}</h1>
          <p class="page-subtitle">{{ isEdit ? 'Módosítsa az épület adatait és területét.' : 'Adja meg az épület adatait és jelölje ki a területét a térképen.' }}</p>
        </div>
      </div>

      <div class="form-layout">
        <!-- Left: form fields -->
        <mat-card class="form-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>info</mat-icon>
              Alapadatok
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" class="fields-form">
              <mat-form-field appearance="outline">
                <mat-label>Épület neve *</mat-label>
                <input matInput formControlName="name" />
                @if (f['name'].hasError('required') && f['name'].touched) {
                  <mat-error>A név kötelező.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Kód *</mat-label>
                <input matInput formControlName="code" placeholder="pl. FO-01" />
                @if (f['code'].hasError('required') && f['code'].touched) {
                  <mat-error>A kód kötelező.</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Leírás</mat-label>
                <textarea matInput formControlName="description" rows="3"></textarea>
              </mat-form-field>

              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Szintek száma *</mat-label>
                  <input matInput type="number" formControlName="floors" min="1" />
                  @if (f['floors'].hasError('required') && f['floors'].touched) {
                    <mat-error>Kötelező mező.</mat-error>
                  }
                  @if (f['floors'].hasError('min') && f['floors'].touched) {
                    <mat-error>Legalább 1 szint szükséges.</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Alapterület (m²) *</mat-label>
                  <input matInput type="number" formControlName="area" min="1" />
                  @if (f['area'].hasError('required') && f['area'].touched) {
                    <mat-error>Kötelező mező.</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="checkbox-row">
                <mat-checkbox formControlName="isPublic">
                  Nyilvános épület (mindenki láthatja)
                </mat-checkbox>
              </div>

              <mat-divider />

              <div class="polygon-section">
                <div class="polygon-header">
                  <span class="polygon-label">
                    <mat-icon>pentagon</mat-icon>
                    Területi pontok
                    <span class="point-count">({{ polygonArray.length }} pont)</span>
                  </span>
                  <div class="polygon-actions">
                    <button
                      mat-icon-button
                      matTooltip="Visszavonás"
                      [disabled]="undoStack().length === 0"
                      (click)="undo()"
                      type="button"
                    >
                      <mat-icon>undo</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      matTooltip="Újra"
                      [disabled]="redoStack().length === 0"
                      (click)="redo()"
                      type="button"
                    >
                      <mat-icon>redo</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      matTooltip="Terület törlése"
                      color="warn"
                      [disabled]="polygonArray.length === 0"
                      (click)="clearPolygon()"
                      type="button"
                    >
                      <mat-icon>clear</mat-icon>
                    </button>
                  </div>
                </div>
                @if (form.get('polygon')?.hasError('minPoints') && form.get('polygon')?.touched) {
                  <div class="polygon-error">
                    <mat-icon>error_outline</mat-icon>
                    Legalább 3 pont szükséges a területhez.
                  </div>
                }
                @if (polygonArray.length > 0) {
                  <div class="polygon-hint">Kattintson a térképen lévő polygon sarkpontjaira a szerkesztéshez, vagy rajzoljon újat.</div>
                } @else {
                  <div class="polygon-hint">Rajzolja meg az épület területét a térképen a rajzolás eszközzel.</div>
                }
              </div>
            </form>
          </mat-card-content>

          <mat-card-actions class="form-actions">
            <button mat-button type="button" (click)="goBack()">Mégse</button>
            <button
              mat-raised-button
              color="primary"
              type="button"
              [disabled]="saving()"
              (click)="submit()"
            >
              @if (saving()) {
                <mat-spinner diameter="20" />
              } @else {
                <mat-icon>save</mat-icon>
              }
              @if (!saving()) {
                {{ isEdit ? 'Mentés' : 'Létrehozás' }}
              }
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Right: map -->
        <mat-card class="map-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>map</mat-icon>
              Terület kijelölése
            </mat-card-title>
            <mat-card-subtitle>
              Használja a rajzolás eszközt a bal oldalon a polygon elkészítéséhez
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="map-content">
            <div #mapContainer class="map-container"></div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .form-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .form-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;
    }
    .page-title {
      margin: 0 0 4px;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a2e;
    }
    .page-subtitle {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
    .form-layout {
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .form-layout {
        grid-template-columns: 1fr;
      }
      .map-card {
        height: 400px;
      }
    }
    .form-card {
      border-radius: 12px !important;
    }
    .form-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fields-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
    }
    .fields-form mat-form-field {
      width: 100%;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .checkbox-row {
      margin: 8px 0;
    }
    .polygon-section {
      margin-top: 16px;
    }
    .polygon-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .polygon-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #333;
    }
    .point-count {
      font-weight: normal;
      color: #888;
      font-size: 0.85rem;
    }
    .polygon-actions {
      display: flex;
      gap: 4px;
    }
    .polygon-hint {
      font-size: 0.8rem;
      color: #888;
      margin-top: 4px;
    }
    .polygon-error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #d32f2f;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px !important;
    }
    .form-actions mat-spinner {
      margin: auto;
    }
    .map-card {
      border-radius: 12px !important;
      height: 650px;
      display: flex;
      flex-direction: column;
    }
    .map-content {
      flex: 1;
      padding: 0 16px 16px !important;
    }
    .map-container {
      height: 100%;
      min-height: 400px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
  `],
})
export class BuildingFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly buildingService = inject(BuildingService);
  private readonly notification = inject(NotificationService);

  readonly saving = signal(false);
  readonly loading = signal(false);

  readonly undoStack = signal<LatLng[][]>([]);
  readonly redoStack = signal<LatLng[][]>([]);

  isEdit = false;
  buildingId: string | null = null;
  private existingBuilding: Building | null = null;

  private map!: L.Map;
  private drawnItems!: L.FeatureGroup;
  private drawControl!: L.Control.Draw;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    description: [''],
    floors: [1, [Validators.required, Validators.min(1)]],
    area: [0, [Validators.required, Validators.min(1)]],
    isPublic: [false],
    polygon: this.fb.array([], minPolygonPoints(3)),
  });

  get f() { return this.form.controls; }
  get polygonArray(): FormArray { return this.form.get('polygon') as FormArray; }

  ngOnInit(): void {
    this.buildingId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.buildingId;
    if (this.isEdit && this.buildingId) {
      this.loadBuilding(this.buildingId);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
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

    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    this.drawControl = new L.Control.Draw({
      edit: { featureGroup: this.drawnItems },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#1565c0', fillColor: '#42a5f5', fillOpacity: 0.4 },
        },
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: false,
      },
    });
    this.map.addControl(this.drawControl);

    this.map.on('draw:created' as keyof L.LeafletEventHandlerFnMap, (event: L.LeafletEvent) => {
      const layer = (event as unknown as { layer: L.Layer }).layer;
      this.drawnItems.clearLayers();
      this.drawnItems.addLayer(layer);
      const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
      this.pushUndoAndSetPolygon(latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng })));
    });

    this.map.on('draw:edited' as keyof L.LeafletEventHandlerFnMap, (event: L.LeafletEvent) => {
      const layers = (event as unknown as { layers: L.LayerGroup }).layers;
      layers.eachLayer((layer) => {
        const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
        this.pushUndoAndSetPolygon(latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng })));
      });
    });

    this.map.on('draw:deleted' as keyof L.LeafletEventHandlerFnMap, () => {
      this.pushUndoAndSetPolygon([]);
    });

    if (this.existingBuilding) {
      this.renderExistingPolygon(this.existingBuilding.polygon);
    }
  }

  private loadBuilding(id: string): void {
    this.loading.set(true);
    this.buildingService
      .getById(id)
      .pipe(
        catchError((err) => {
          this.notification.error('Nem sikerült betölteni az épületet.');
          this.router.navigate(['/buildings']);
          return throwError(() => err);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((building) => {
        this.existingBuilding = building;
        this.form.patchValue({
          name: building.name,
          code: building.code,
          description: building.description,
          floors: building.floors,
          area: building.area,
          isPublic: building.isPublic,
        });
        this.setPolygonFormArray(building.polygon);
        if (this.map) {
          this.renderExistingPolygon(building.polygon);
        }
      });
  }

  private renderExistingPolygon(polygon: LatLng[]): void {
    if (!polygon?.length) return;
    this.drawnItems.clearLayers();
    const latLngs = polygon.map((p) => L.latLng(p.lat, p.lng));
    const poly = L.polygon(latLngs, {
      color: '#1565c0',
      fillColor: '#42a5f5',
      fillOpacity: 0.4,
    });
    this.drawnItems.addLayer(poly);
    this.map.fitBounds(poly.getBounds(), { padding: [40, 40] });
  }

  private setPolygonFormArray(points: LatLng[]): void {
    while (this.polygonArray.length > 0) this.polygonArray.removeAt(0);
    points.forEach((p) =>
      this.polygonArray.push(this.fb.group({ lat: [p.lat], lng: [p.lng] }))
    );
  }

  private pushUndoAndSetPolygon(points: LatLng[]): void {
    const current = this.polygonArray.value as LatLng[];
    this.undoStack.update((s) => [...s, current]);
    this.redoStack.set([]);
    this.setPolygonFormArray(points);
  }

  /**
   * Visszavonja az utolsó térképes módosítást a poligonon.
   */
  undo(): void {
    const stack = this.undoStack();
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    this.undoStack.update((s) => s.slice(0, -1));
    const current = this.polygonArray.value as LatLng[];
    this.redoStack.update((s) => [...s, current]);
    this.setPolygonFormArray(prev);
    this.renderExistingPolygon(prev);
  }

  /**
   * Újra végrehajtja a korábban visszavont térképes módosítást a poligonon.
   */
  redo(): void {
    const stack = this.redoStack();
    if (!stack.length) return;
    const next = stack[stack.length - 1];
    this.redoStack.update((s) => s.slice(0, -1));
    const current = this.polygonArray.value as LatLng[];
    this.undoStack.update((s) => [...s, current]);
    this.setPolygonFormArray(next);
    this.renderExistingPolygon(next);
  }

  clearPolygon(): void {
    const current = this.polygonArray.value as LatLng[];
    this.undoStack.update((s) => [...s, current]);
    this.redoStack.set([]);
    this.drawnItems.clearLayers();
    this.setPolygonFormArray([]);
  }

  /**
   * Elküldi az űrlap adatait (létrehozás vagy frissítés céljából) a szerver felé.
   */
  submit(): void {
    this.form.get('polygon')?.markAsTouched();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const polygonPoints: LatLng[] = (rawValue.polygon as any[]).map((p) => ({
      lat: p.lat as number,
      lng: p.lng as number,
    }));

    const payload: BuildingCreate = {
      name: rawValue.name!,
      code: rawValue.code!,
      description: rawValue.description ?? '',
      floors: rawValue.floors!,
      area: rawValue.area!,
      isPublic: rawValue.isPublic ?? false,
      polygon: polygonPoints,
    };

    this.saving.set(true);

    const request$ =
      this.isEdit && this.buildingId
        ? this.buildingService.update(this.buildingId, payload)
        : this.buildingService.create(payload);

    request$
      .pipe(
        catchError((err) => {
          this.notification.error(this.isEdit ? 'Mentés sikertelen.' : 'Létrehozás sikertelen.');
          return throwError(() => err);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(() => {
        this.notification.success(this.isEdit ? 'Épület sikeresen mentve.' : 'Épület sikeresen létrehozva.');
        this.router.navigate(['/']); // Visszairányítás a gyökér dashboard-ra
      });
  }

  /**
   * Visszairányítja a felhasználót a főoldalra.
   */
  goBack(): void {
    this.router.navigate(['/']); // Visszairányítás a gyökér dashboard-ra
  }
}
