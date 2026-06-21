import { Directive, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Directive({
  selector: '[appDblClickEdit]',
  standalone: true,
})
export class DoubleClickEditDirective {
  @Input() appDblClickEdit: unknown = undefined;
  @Output() dblClickEdit = new EventEmitter<void>();

  @HostListener('dblclick', ['$event'])
  onDblClick(event: MouseEvent): void {
    event.preventDefault();
    this.dblClickEdit.emit();
  }
}
