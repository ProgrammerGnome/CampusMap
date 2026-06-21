/**
 * @file Épületek kezeléséért felelős szolgáltatás.
 * @description HTTP kéréseket indít a backend felé az épületek lekérdezésére, létrehozására, módosítására és törlésére.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Building, BuildingCreate, BuildingUpdate } from '../models/building.model';
import { BuildingStore } from '../store/building.store';
import { AuthStore } from '../store/auth.store';

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private readonly http = inject(HttpClient);
  private readonly buildingStore = inject(BuildingStore);
  private readonly authStore = inject(AuthStore);

  /**
   * Lekérdezi az összes épületet a szerverről.
   * Sikeres válasz esetén frissíti a lokális állapotot (store).
   * * @returns {Observable<Building[]>} Az épületek listáját tartalmazó Observable.
   */
  getAll(): Observable<Building[]> {
    return this.http.get<Building[]>('/api/buildings').pipe(
      tap(buildings => this.buildingStore.setBuildings(buildings))
    );
  }

  /**
   * Lekérdez egy adott épületet annak azonosítója alapján.
   * * @param {string} id - Az épület azonosítója.
   * @returns {Observable<Building>} A lekérdezett épületet tartalmazó Observable.
   */
  getById(id: string): Observable<Building> {
    return this.http.get<Building>(`/api/buildings/${id}`);
  }

  /**
   * Létrehoz egy új épületet a megadott adatok alapján.
   * A felhasználói azonosítót és a létrehozás dátumát automatikusan hozzáfűzi.
   * * @param {BuildingCreate} data - Az új épület adatai.
   * @returns {Observable<Building>} A létrehozott épületet tartalmazó Observable.
   */
  create(data: BuildingCreate): Observable<Building> {
    const payload = {
      ...data,
      userId: this.authStore.user()?.id,
      createdAt: new Date().toISOString()
    };
    return this.http.post<Building>('/api/buildings', payload).pipe(
      tap(building => this.buildingStore.addBuilding(building))
    );
  }

  /**
   * Frissíti egy meglévő épület adatait.
   * * @param {string} id - A módosítandó épület azonosítója.
   * @param {BuildingUpdate} data - A módosított adatok.
   * @returns {Observable<Building>} A frissített épületet tartalmazó Observable.
   */
  update(id: string, data: BuildingUpdate): Observable<Building> {
    return this.http.patch<Building>(`/api/buildings/${id}`, data).pipe(
      tap(building => this.buildingStore.updateBuilding(building))
    );
  }

  /**
   * Töröl egy épületet az adatbázisból azonosító alapján.
   * * @param {string} id - A törlendő épület azonosítója.
   * @returns {Observable<void>} Observable, amely a törlés befejezését jelzi.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/buildings/${id}`).pipe(
      tap(() => this.buildingStore.removeBuilding(id))
    );
  }
}