import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[appHoverHighlight]',
  standalone: true,
})
export class HoverHighlightDirective implements OnChanges {
  @Input() appHoverHighlight = false;
  @Output() hovered = new EventEmitter<boolean>();

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appHoverHighlight']) {
      this.setHighlight(this.appHoverHighlight);
    }
  }

  @HostListener('mouseenter')
  onEnter(): void {
    this.hovered.emit(true);
    this.setHighlight(true);
  }

  @HostListener('mouseleave')
  onLeave(): void {
    this.hovered.emit(false);
    this.setHighlight(false);
  }

  private setHighlight(active: boolean): void {
    if (active) {
      this.renderer.addClass(this.el.nativeElement, 'highlighted');
    } else {
      this.renderer.removeClass(this.el.nativeElement, 'highlighted');
    }
  }
}
