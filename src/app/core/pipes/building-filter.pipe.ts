import { Pipe, PipeTransform } from '@angular/core';
import { Building } from '../models/building.model';

@Pipe({ name: 'buildingFilter', standalone: true, pure: false })
export class BuildingFilterPipe implements PipeTransform {
  transform(buildings: Building[], search: string): Building[] {
    if (!search) return buildings;
    const q = search.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }
}
