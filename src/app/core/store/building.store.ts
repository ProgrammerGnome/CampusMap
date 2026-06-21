/**
 * @file Épületek adatainak állapotkezelője.
 * @description NgRx Signals alapú store az épületek listájának, a kiválasztott/kiemelt elemeknek és a szűrőfeltételeknek a nyilvántartására.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { Building, BuildingFilter } from '../models/building.model';
import { AuthStore } from './auth.store';

interface BuildingState {
  buildings: Building[];
  selectedId: string | null;
  highlightedId: string | null;
  filter: BuildingFilter;
  showOwnAndPublic: boolean;
}

const initialState: BuildingState = {
  buildings: [],
  selectedId: null,
  highlightedId: null,
  filter: { search: '', showPublicOnly: false },
  showOwnAndPublic: true,
};

export const BuildingStore = signalStore(
  { providedIn: 'root' },
  withState<BuildingState>(initialState),
  withComputed((store) => {
    const authStore = inject(AuthStore);
    return {
      /**
       * Számított érték, amely visszaadja a szűrési feltételeknek (keresés, publikus/privát) megfelelő épületeket.
       * * @returns {Building[]} A szűrt épületek tömbje.
       */
      filteredBuildings: computed(() => {
        const userId = authStore.user()?.id;
        const { search, showPublicOnly } = store.filter();
        const showBoth = store.showOwnAndPublic();

        return store.buildings().filter((b) => {
          const ownedByUser = b.userId === userId;
          const visible = showBoth ? ownedByUser || b.isPublic : ownedByUser;
          if (!visible) return false;
          if (showPublicOnly && !b.isPublic) return false;
          if (search) {
            const q = search.toLowerCase();
            return (
              b.name.toLowerCase().includes(q) ||
              b.code.toLowerCase().includes(q) ||
              b.description.toLowerCase().includes(q)
            );
          }
          return true;
        });
      }),
      
      /**
       * Számított érték, amely visszaadja a kiválasztott épület objektumát az azonosító alapján.
       * * @returns {Building | null} A kiválasztott épület, vagy null, ha nincs kiválasztva.
       */
      selectedBuilding: computed(() => store.buildings().find((b) => b.id === store.selectedId()) ?? null),
    };
  }),
  withMethods((store) => ({
    setBuildings(buildings: Building[]): void { patchState(store, { buildings }); },
    addBuilding(building: Building): void { patchState(store, { buildings: [...store.buildings(), building] }); },
    updateBuilding(updated: Building): void {
      patchState(store, { buildings: store.buildings().map((b) => (b.id === updated.id ? updated : b)) });
    },
    removeBuilding(id: string): void { patchState(store, { buildings: store.buildings().filter((b) => b.id !== id) }); },
    selectBuilding(id: string | null): void { patchState(store, { selectedId: id }); },
    setHighlightedId(id: string | null): void { patchState(store, { highlightedId: id }); },
    setFilter(filter: Partial<BuildingFilter>): void { patchState(store, { filter: { ...store.filter(), ...filter } }); },
    setShowOwnAndPublic(value: boolean): void { patchState(store, { showOwnAndPublic: value }); },
  }))
);