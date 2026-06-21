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

  getAll(): Observable<Building[]> {
    return this.http.get<Building[]>('/api/buildings').pipe(
      tap(buildings => this.buildingStore.setBuildings(buildings))
    );
  }

  getById(id: string): Observable<Building> {
    return this.http.get<Building>(`/api/buildings/${id}`);
  }

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

  update(id: string, data: BuildingUpdate): Observable<Building> {
    return this.http.patch<Building>(`/api/buildings/${id}`, data).pipe(
      tap(building => this.buildingStore.updateBuilding(building))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/buildings/${id}`).pipe(
      tap(() => this.buildingStore.removeBuilding(id))
    );
  }
}