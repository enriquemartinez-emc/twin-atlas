import { Component, input, output } from '@angular/core';
import type { AnnotationSummary } from '@api/index';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTypographyImports } from '@shared/ui/typography';

@Component({
  selector: 'app-annotation-list',
  imports: [HlmBadgeImports, HlmItemImports, HlmTypographyImports],
  template: `
    @if (items().length === 0) {
      <p hlmMuted>Nothing here yet. Add a marker, note or outline.</p>
    } @else {
      <ul hlmItemGroup aria-label="Annotations in view">
        @for (item of items(); track item.id) {
          <li>
            <button
              hlmItem
              size="sm"
              type="button"
              [variant]="item.id === selectedId() ? 'muted' : 'outline'"
              [attr.aria-current]="item.id === selectedId() ? 'true' : null"
              (click)="selected.emit(item)"
            >
              <span hlmItemContent>
                <span hlmItemTitle>{{ item.title }}</span>
                <span hlmItemDescription>
                  <span hlmBadge variant="secondary">{{ labelOf(item.kind) }}</span>
                  @if (item.body) {
                    {{ item.body }}
                  }
                </span>
              </span>
            </button>
          </li>
        }
      </ul>
    }
    @if (truncated()) {
      <p hlmMuted role="status">
        More annotations are in view than shown. Zoom in to see them all.
      </p>
    }
  `,
  styles: `
    button[hlmItem] {
      cursor: pointer;
      text-align: start;
    }

    button[hlmItem]:hover {
      background: var(--accent);
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
