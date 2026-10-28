import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  injectAsync,
  signal,
  viewChild,
} from '@angular/core';
import { environment } from '@env/environment';
import type { MapService } from '@map/public-api';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { IonTokenStore } from './ion-token.store';

@Component({
  selector: 'app-scene-viewer',
  imports: [DecimalPipe, HlmButtonImports, HlmInputImports],
  template: `
    <div #viewport class="absolute inset-0"></div>

    <aside
      class="border-border bg-card/90 text-card-foreground absolute top-3 left-3 z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col gap-3 rounded-lg border p-3 text-sm shadow-md backdrop-blur"
      aria-label="Scene information"
    >
      @if (loadError(); as error) {
        <p role="alert" class="text-destructive">{{ error }}</p>
      }

      @if (map(); as map) {
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt class="text-muted-foreground">Source</dt>
          <dd>
            {{
              map.mode() === 'photorealistic' ? 'Google Photorealistic 3D Tiles' : 'OpenStreetMap'
            }}
          </dd>
          @if (map.cameraPosition(); as position) {
            <dt class="text-muted-foreground">Camera</dt>
            <dd>
              {{ position.latitude | number: '1.4-4' }},
              {{ position.longitude | number: '1.4-4' }} · {{ position.height | number: '1.0-0' }} m
            </dd>
          }
          @if (map.visibleBbox(); as bbox) {
            <dt class="text-muted-foreground">Visible</dt>
            <dd>
              W {{ bbox.west | number: '1.3-3' }} S {{ bbox.south | number: '1.3-3' }} E
              {{ bbox.east | number: '1.3-3' }} N {{ bbox.north | number: '1.3-3' }}
            </dd>
          }
        </dl>

        <button hlmBtn variant="outline" size="sm" type="button" (click)="resetView()">
          Reset view
        </button>
      }

      @if (map()?.mode() === 'osm') {
        @if (map()?.tilesError()) {
          <p role="status" class="text-destructive">
            3D tiles could not be loaded with the saved token. Check it and try again.
          </p>
        }
        <form class="flex flex-col gap-2" (submit)="saveToken($event)">
          <label for="ion-token" class="font-medium">Cesium ion token</label>
          <p class="text-muted-foreground">
            Paste a free token to load photorealistic 3D tiles. It stays in this browser only.
          </p>
          <input
            hlmInput
            id="ion-token"
            type="password"
            autocomplete="off"
            [value]="tokenDraft()"
            (input)="tokenDraft.set(readValue($event))"
          />
          <button hlmBtn size="sm" type="submit" [disabled]="!tokenDraft().trim()">
            Load 3D tiles
          </button>
        </form>
      } @else if (map()?.mode() === 'photorealistic') {
        <button hlmBtn variant="ghost" size="sm" type="button" (click)="forgetToken()">
          Forget token
        </button>
      }
    </aside>
  `,
})
export class SceneViewerPage {
  private readonly loadMap = injectAsync(() =>
    import('@map/map.service').then((m) => m.MapService),
  );
  private readonly ionTokenStore = inject(IonTokenStore);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private destroyed = false;

  protected readonly map = signal<MapService | null>(null);
  protected readonly tokenDraft = signal('');
  protected readonly loadError = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.map()?.destroy();
    });
  }

  protected resetView(): void {
    this.map()?.flyTo(environment.defaultView);
  }

  protected saveToken(event: Event): void {
    event.preventDefault();
    this.ionTokenStore.save(this.tokenDraft());
    this.tokenDraft.set('');
    void this.start();
  }

  protected forgetToken(): void {
    this.ionTokenStore.clear();
    void this.start();
  }

  protected readValue(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  private async start(): Promise<void> {
    this.loadError.set(null);
    try {
      const map = await this.loadMap();
      if (this.destroyed) return;
      this.map.set(map);
      await map.init(this.viewport().nativeElement, {
        ionToken: this.ionTokenStore.token(),
        initialView: environment.defaultView,
      });
    } catch (error) {
      if (this.destroyed) return;
      this.loadError.set(
        error instanceof Error
          ? `Could not start the 3D viewer: ${error.message}`
          : 'Could not start the 3D viewer.',
      );
    }
  }
}
