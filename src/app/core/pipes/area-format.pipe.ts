import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'areaFormat', standalone: true })
export class AreaFormatPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '-';
    return `${value.toLocaleString('hu-HU')} m²`;
  }
}
