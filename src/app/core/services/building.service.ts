import { inject, Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { supabase } from './supabase.client';
import { Building, BuildingCreate, BuildingUpdate, LatLng } from '../models/building.model';
import { BuildingStore } from '../store/building.store';

// Map Supabase row (snake_case) to TypeScript model (camelCase)
function toBuilding(row: Record<string, unknown>): Building {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    code: row['code'] as string,
    description: row['description'] as string,
    floors: row['floors'] as number,
    area: Number(row['area']),
    polygon: (row['polygon'] as LatLng[]) ?? [],
    isPublic: row['is_public'] as boolean,
    userId: row['user_id'] as string,
    createdAt: row['created_at'] as string,
  };
}

// Map TypeScript model (camelCase) to Supabase insert/update payload (snake_case)
function toPayload(data: BuildingCreate | BuildingUpdate): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload['name'] = data.name;
  if (data.code !== undefined) payload['code'] = data.code;
  if (data.description !== undefined) payload['description'] = data.description;
  if (data.floors !== undefined) payload['floors'] = data.floors;
  if (data.area !== undefined) payload['area'] = data.area;
  if (data.polygon !== undefined) payload['polygon'] = data.polygon;
  if (data.isPublic !== undefined) payload['is_public'] = data.isPublic;
  // user_id intentionally omitted — DEFAULT auth.uid() fills it on INSERT
  return payload;
}

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private readonly buildingStore = inject(BuildingStore);

  getAll(): Observable<Building[]> {
    return from(
      supabase.from('buildings').select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((r) => toBuilding(r as Record<string, unknown>));
      }),
      tap((buildings) => this.buildingStore.setBuildings(buildings))
    );
  }

  getById(id: string): Observable<Building> {
    return from(
      supabase.from('buildings').select('*').eq('id', id).maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) throw new Error('Building not found');
        return toBuilding(data as Record<string, unknown>);
      })
    );
  }

  create(data: BuildingCreate): Observable<Building> {
    return from(
      supabase.from('buildings').insert(toPayload(data)).select().single()
    ).pipe(
      map(({ data: row, error }) => {
        if (error) throw error;
        return toBuilding(row as Record<string, unknown>);
      }),
      tap((building) => this.buildingStore.addBuilding(building))
    );
  }

  update(id: string, data: BuildingUpdate): Observable<Building> {
    return from(
      supabase.from('buildings').update(toPayload(data)).eq('id', id).select().single()
    ).pipe(
      map(({ data: row, error }) => {
        if (error) throw error;
        return toBuilding(row as Record<string, unknown>);
      }),
      tap((building) => this.buildingStore.updateBuilding(building))
    );
  }

  delete(id: string): Observable<void> {
    return from(
      supabase.from('buildings').delete().eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      tap(() => this.buildingStore.removeBuilding(id))
    );
  }
}
