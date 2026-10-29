import { Component, computed, input, output, signal } from '@angular/core';
import type { AnnotationSummary } from '@api/index';
import { PALETTE } from '@map/palette';
import { BadgeDot } from '@shared/components/badge-dot';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTypographyImports } from '@shared/ui/typography';

type Kind = AnnotationSummary['kind'];
type Filter = 'ALL' | Kind;

const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MARKER', label: 'Markers' },
  { value: 'NOTE', label: 'Notes' },
  { value: 'OUTLINE', label: 'Outlines' },
];

const KIND_NAMES: Record<Kind, string> = { MARKER: 'Marker', NOTE: 'Note', OUTLINE: 'Outline' };

/** Titles the OpenStreetMap import gives: `Name (node/123)` or `OSM node/123`. */
const IMPORTED_TITLE = /\((?:node|way)\/\d+\)$|^OSM (?:node|way)\/\d+$/;

@Component({
  selector: 'app-annotation-list',
  imports: [
    BadgeDot,
    HlmEmptyImports,
    HlmItemImports,
    HlmSkeleton,
    HlmToggleGroupImports,
    HlmTypographyImports,
  ],
  template: `
    <section aria-labelledby="in-view">
      <h3 hlmSmall id="in-view">In this view</h3>
      <p hlmMuted>
        Everything added inside the part of the map you are looking at. Pan or zoom the map to
        change it.
      </p>

      @if (loading() && items().length === 0) {
        <div class="rows" role="status" aria-label="Loading annotations">
          @for (row of placeholderRows; track row) {
            <div hlmSkeleton></div>
          }
        </div>
      } @else if (items().length === 0) {
        <div hlmEmpty>
          <div hlmEmptyHeader>
            <p hlmEmptyTitle>Nothing here yet</p>
            <p hlmEmptyDescription>
              Choose Marker, Note or Outline above, then click the map inside the green area.
            </p>
          </div>
        </div>
      } @else {
        <p hlmMuted>{{ countText() }}</p>
        <div
          hlmToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Show"
          [value]="filter()"
          (valueChange)="chooseFilter($event)"
        >
          @for (option of filters; track option.value) {
            <button hlmToggleGroupItem [value]="option.value">{{ option.label }}</button>
          }
        </div>

        @if (shown().length === 0) {
          <p hlmMuted>Nothing of that kind in this view.</p>
        } @else {
          <ul hlmItemGroup aria-label="Annotations in view">
            @for (item of shown(); track item.id) {
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
                      <app-badge-dot [color]="colourOf(item.kind)">{{
                        labelOf(item.kind)
                      }}</app-badge-dot>
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

        @if (hasImported()) {
          <p hlmMuted>
            Titles ending in (node/…) or (way/…) were imported from OpenStreetMap. The reference
            keeps each title unique, so importing the same data twice adds nothing.
          </p>
        }
      }

      @if (truncated()) {
        <p hlmMuted role="status">
          More annotations are in view than shown. Zoom in to see them all.
        </p>
      }
    </section>
  `,
  styles: `
    section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .rows [hlmSkeleton] {
      height: 3.25rem;
    }

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
  readonly loading = input(false);

  readonly selected = output<AnnotationSummary>();

  protected readonly filters = FILTERS;
  protected readonly placeholderRows = [1, 2, 3];
  protected readonly filter = signal<Filter>('ALL');

  protected readonly shown = computed(() => {
    const filter = this.filter();
    return filter === 'ALL' ? this.items() : this.items().filter((item) => item.kind === filter);
  });

  protected readonly countText = computed(() => {
    const total = this.items().length;
    const shown = this.shown().length;
    return shown === total ? `${total} in view` : `${shown} of ${total} in view`;
  });

  protected readonly hasImported = computed(() =>
    this.items().some((item) => IMPORTED_TITLE.test(item.title)),
  );

  /** The toggle group reports its value as unknown: only a known filter is acted on. */
  protected chooseFilter(value: unknown): void {
    const chosen = FILTERS.find((option) => option.value === value)?.value;
    if (chosen) this.filter.set(chosen);
  }

  protected labelOf(kind: Kind): string {
    return KIND_NAMES[kind];
  }

  protected colourOf(kind: Kind): string {
    return PALETTE[kind];
  }
}
