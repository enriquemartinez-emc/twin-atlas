import { Component, computed, input } from '@angular/core';
import type { MapMode } from './map/map-viewer';
import { HlmSpinner } from '@shared/ui/spinner';

/** Tells the user the map is on its way, from the viewer starting until the first view is drawn. */
@Component({
  selector: 'app-map-loading',
  imports: [HlmSpinner],
  template: `
    <div class="card" role="status">
      <hlm-spinner aria-label="Loading the map" />
      <div>
        <p class="title">{{ title() }}</p>
        @if (mode() === 'photorealistic') {
          <p class="hint">Google's 3D tiles can take a few seconds to arrive.</p>
        }
        @defer (on timer(15s)) {
          <p class="hint">Still loading. The map needs an internet connection.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--card);
    }

    p {
      margin: 0;
    }

    .title {
      font-weight: 500;
    }

    .hint {
      color: var(--muted-foreground);
      font-size: 0.8125rem;
    }
  `,
})
export class MapLoading {
  /** Null while the viewer itself is still starting. */
  readonly mode = input<MapMode | null>(null);

  protected readonly title = computed(() =>
    this.mode() === null ? 'Starting the 3D viewer…' : 'Loading the map…',
  );
}
