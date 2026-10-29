import { Component, computed, input, output, signal } from '@angular/core';
import type { AnnotationSummary } from '@api/index';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideList } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { HlmTypographyImports } from '@shared/ui/typography';
import { KIND_ICONS, KIND_META } from '../kind-meta';

type Kind = AnnotationSummary['kind'];
type Filter = 'ALL' | Kind;

const KINDS: readonly Kind[] = ['MARKER', 'NOTE', 'OUTLINE'];

/** Titles the OpenStreetMap import gives: `Name (node/123)` or `OSM node/123`. */
const IMPORTED_TITLE = /\((?:node|way)\/\d+\)$|^OSM (?:node|way)\/\d+$/;

const IMPORTED_HINT =
  'Imported from OpenStreetMap. The reference in the title keeps each place unique, so importing the same data twice adds nothing.';

@Component({
  selector: 'app-annotation-list',
  imports: [
    NgIcon,
    HlmBadgeImports,
    HlmEmptyImports,
    HlmItemImports,
    HlmSkeleton,
    HlmToggleGroupImports,
    HlmTooltipImports,
    HlmTypographyImports,
  ],
  providers: [provideIcons({ ...KIND_ICONS, lucideList })],
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
              Choose a tool on the left, then click the map inside the green area.
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
          <button hlmToggleGroupItem value="ALL" aria-label="All kinds">
            <ng-icon name="lucideList" />
            {{ items().length }}
          </button>
          @for (kind of kinds; track kind) {
            <button
              hlmToggleGroupItem
              [value]="kind"
              [aria-label]="meta[kind].plural"
              [hlmTooltip]="meta[kind].plural"
            >
              <ng-icon [name]="meta[kind].icon" [style.color]="meta[kind].colour" />
              {{ counts()[kind] }}
            </button>
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
                  <ng-icon [name]="meta[item.kind].icon" [style.color]="meta[item.kind].colour" />
                  <span hlmItemContent>
                    <span hlmItemTitle>{{ item.title }}</span>
                    <span hlmItemDescription>{{ item.body || meta[item.kind].label }}</span>
                  </span>
                  @if (isImported(item)) {
                    <span hlmBadge variant="outline" [hlmTooltip]="importedHint">OSM</span>
                  }
                </button>
              </li>
            }
          </ul>
        }

        @if (hasImported()) {
          <p hlmMuted>OSM marks places imported from OpenStreetMap.</p>
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

  protected readonly kinds = KINDS;
  protected readonly meta = KIND_META;
  protected readonly importedHint = IMPORTED_HINT;
  protected readonly placeholderRows = [1, 2, 3];
  protected readonly filter = signal<Filter>('ALL');

  protected readonly shown = computed(() => {
    const filter = this.filter();
    return filter === 'ALL' ? this.items() : this.items().filter((item) => item.kind === filter);
  });

  protected readonly counts = computed(() => {
    const counts: Record<Kind, number> = { MARKER: 0, NOTE: 0, OUTLINE: 0 };
    for (const item of this.items()) counts[item.kind]++;
    return counts;
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
    if (value === 'ALL') this.filter.set('ALL');
    const kind = KINDS.find((candidate) => candidate === value);
    if (kind) this.filter.set(kind);
  }

  protected isImported(item: AnnotationSummary): boolean {
    return IMPORTED_TITLE.test(item.title);
  }
}
