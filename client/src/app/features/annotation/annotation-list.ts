import { Component, input, output } from '@angular/core';
import type { AnnotationSummary } from '@api/index';

@Component({
  selector: 'app-annotation-list',
  template: `
    @if (items().length === 0) {
      <p class="text-muted-foreground">Nothing here yet. Add a marker, note or outline.</p>
    } @else {
      <ul class="flex flex-col gap-1" aria-label="Annotations in view">
        @for (item of items(); track item.id) {
          <li>
            <button
              type="button"
              class="hover:bg-accent focus-visible:ring-ring flex w-full flex-col rounded-md border px-2 py-1 text-left outline-none focus-visible:ring-2"
              [class.border-primary]="item.id === selectedId()"
              [attr.aria-current]="item.id === selectedId() ? 'true' : null"
              (click)="selected.emit(item)"
            >
              <span class="font-medium">{{ item.title }}</span>
              <span class="text-muted-foreground text-xs">
                {{ labelOf(item.kind) }}
                @if (item.body) {
                  · {{ item.body }}
                }
              </span>
            </button>
          </li>
        }
      </ul>
    }
    @if (truncated()) {
      <p class="text-muted-foreground text-xs" role="status">
        More annotations are in view than shown. Zoom in to see them all.
      </p>
    }
  `,
})
export class AnnotationList {
  readonly items = input.required<readonly AnnotationSummary[]>();
  readonly selectedId = input<string | null>(null);
  readonly truncated = input(false);

  readonly selected = output<AnnotationSummary>();

  protected labelOf(kind: AnnotationSummary['kind']): string {
    return kind === 'MARKER' ? 'Marker' : kind === 'NOTE' ? 'Note' : 'Outline';
  }
}
