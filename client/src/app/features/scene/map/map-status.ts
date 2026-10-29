import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import type { CameraPosition } from './bbox';
import type { MapMode } from './map-viewer';
import { BadgeDot } from '@shared/badge-dot';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmTooltipImports } from '@shared/ui/tooltip';

const SOURCES: Record<MapMode, { readonly name: string; readonly colour: string }> = {
  photorealistic: { name: 'Google Photorealistic 3D Tiles', colour: '#16a34a' },
  osm: { name: 'OpenStreetMap', colour: '#d97706' },
};

/** Where the picture comes from and where the camera is, at the map's bottom edge. */
@Component({
  selector: 'app-map-status',
  imports: [DecimalPipe, NgIcon, BadgeDot, HlmButtonImports, HlmTooltipImports],
  providers: [provideIcons({ lucideHouse })],
  template: `
    @if (mode(); as mode) {
      <div class="bar">
        <app-badge-dot [color]="sources[mode].colour">{{ sources[mode].name }}</app-badge-dot>
        @if (position(); as position) {
          <span class="camera">
            {{ position.latitude | number: '1.4-4' }}, {{ position.longitude | number: '1.4-4' }} ·
            {{ position.height | number: '1.0-0' }} m
          </span>
        }
        <button
          hlmBtn
          variant="ghost"
          size="icon-sm"
          type="button"
          hlmTooltip="Back to the starting view"
          (click)="resetRequested.emit()"
        >
          <ng-icon name="lucideHouse" />
          <span class="sr-only">Reset view</span>
        </button>
      </div>
    }
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--card);
      font-size: 0.8125rem;
    }

    .camera {
      color: var(--muted-foreground);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class MapStatus {
  readonly mode = input<MapMode | null>(null);
  readonly position = input<CameraPosition | null>(null);

  readonly resetRequested = output<void>();

  protected readonly sources = SOURCES;
}
