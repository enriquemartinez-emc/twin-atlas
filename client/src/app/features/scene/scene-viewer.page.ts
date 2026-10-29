import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  injectAsync,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { AnnotationSummary } from '@api/index';
import { environment } from '@env/environment';
import {
  AnnotationData,
  AnnotationForm,
  AnnotationList,
  type AnnotationFormValue,
  type AnnotationKind,
  buildCreateRequest,
  focusPoint,
  isDraftReady,
  toMapFeature,
} from '@features/annotation/public-api';
import type { LonLat, MapClick, MapService } from '@map/public-api';
import { bboxPolygon } from '@shared/geo/geojson';
import { problemMessage } from '@shared/problems/problem-message';
import { HlmButtonImports } from '@shared/ui/button';
import { IonTokenPanel } from './ion-token-panel';
import { IonTokenStore } from './ion-token.store';
import { ScenePicker } from './scene-picker';
import { ScenesService } from './scenes.service';

type Tool = 'select' | AnnotationKind;

const TOOLS: readonly { readonly tool: Tool; readonly label: string }[] = [
  { tool: 'select', label: 'Select' },
  { tool: 'MARKER', label: 'Marker' },
  { tool: 'NOTE', label: 'Note' },
  { tool: 'OUTLINE', label: 'Outline' },
];

/** How close to fly when the user picks an annotation from the list, in metres. */
const FOCUS_HEIGHT = 250;

/** Route-level component: owns the map, the chosen scene and the drawing state. */
@Component({
  selector: 'app-scene-viewer',
  imports: [
    DecimalPipe,
    HlmButtonImports,
    ScenePicker,
    AnnotationForm,
    AnnotationList,
    IonTokenPanel,
  ],
  template: `
    <div #viewport class="absolute inset-0"></div>

    <aside
      class="border-border bg-card/95 text-card-foreground absolute top-3 bottom-3 left-3 z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col gap-4 overflow-y-auto rounded-lg border p-3 text-sm shadow-md backdrop-blur"
      aria-label="Scene tools"
    >
      @if (loadError(); as error) {
        <p role="alert" class="text-destructive">{{ error }}</p>
      }

      <app-scene-picker
        [scenes]="scenes.scenes()"
        [selectedId]="scenes.selectedId()"
        [canCreate]="canCreateScene()"
        [busy]="creatingScene()"
        [problem]="sceneProblem()"
        (choose)="scenes.select($event)"
        (create)="createScene($event)"
      />

      @if (scenes.selectedId()) {
        <section class="flex flex-col gap-2" aria-label="Annotations">
          <div class="flex gap-1" role="group" aria-label="Tool">
            @for (option of tools; track option.tool) {
              <button
                hlmBtn
                size="sm"
                type="button"
                [variant]="tool() === option.tool ? 'default' : 'outline'"
                [attr.aria-pressed]="tool() === option.tool"
                (click)="selectTool(option.tool)"
              >
                {{ option.label }}
              </button>
            }
          </div>

          @if (formKind(); as kind) {
            <app-annotation-form
              [kind]="kind"
              [ready]="draftReady()"
              [busy]="saving()"
              [problem]="formProblem()"
              (submitted)="save($event)"
              (cancelled)="selectTool('select')"
            />
          }

          <app-annotation-list
            [items]="data.items()"
            [selectedId]="selectedAnnotationId()"
            [truncated]="data.truncated()"
            (selected)="focus($event)"
          />

          @if (data.failed()) {
            <p role="alert" class="text-destructive">
              Could not load the annotations.
              <button class="underline" type="button" (click)="data.reload()">Try again</button>
            </p>
          }
        </section>
      }

      <details open class="flex flex-col gap-2">
        <summary class="cursor-pointer font-medium">Map</summary>
        <div class="mt-2 flex flex-col gap-3">
          @if (map(); as map) {
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt class="text-muted-foreground">Source</dt>
              <dd>
                {{
                  map.mode() === 'photorealistic'
                    ? 'Google Photorealistic 3D Tiles'
                    : 'OpenStreetMap'
                }}
              </dd>
              @if (map.cameraPosition(); as position) {
                <dt class="text-muted-foreground">Camera</dt>
                <dd>
                  {{ position.latitude | number: '1.4-4' }},
                  {{ position.longitude | number: '1.4-4' }} ·
                  {{ position.height | number: '1.0-0' }} m
                </dd>
              }
            </dl>
            <button hlmBtn variant="outline" size="sm" type="button" (click)="resetView()">
              Reset view
            </button>
          }
          <app-ion-token-panel
            [mode]="map()?.mode() ?? null"
            [tilesError]="map()?.tilesError() ?? null"
            (saved)="saveToken($event)"
            (forgotten)="forgetToken()"
          />
        </div>
      </details>
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

  protected readonly scenes = inject(ScenesService);
  protected readonly data = inject(AnnotationData);
  protected readonly tools = TOOLS;

  protected readonly map = signal<MapService | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly tool = signal<Tool>('select');
  protected readonly draft = signal<readonly LonLat[]>([]);
  protected readonly selectedAnnotationId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formProblem = signal<string | null>(null);
  protected readonly creatingScene = signal(false);
  protected readonly sceneProblem = signal<string | null>(null);

  /** The kind being drawn, or null in select mode. */
  protected readonly formKind = computed(() => {
    const tool = this.tool();
    return tool === 'select' ? null : tool;
  });
  protected readonly draftReady = computed(() => {
    const kind = this.formKind();
    return kind !== null && isDraftReady(kind, this.draft());
  });

  /** A scene is built from the visible area, so the map must have reported one. */
  protected readonly canCreateScene = computed(() => !!this.map()?.visibleBbox());

  private readonly mapFeatures = computed(() => this.data.items().map(toMapFeature));

  constructor() {
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.map()?.destroy();
    });

    // What the page knows feeds the data service...
    effect(() => this.data.sceneId.set(this.scenes.selectedId()));
    effect(() => this.data.view.set(this.map()?.visibleBbox() ?? null));

    // ...and what is known is drawn on the map. `epoch` re-runs these after the map is rebuilt.
    effect(() => {
      const map = this.map();
      if (!map) return;
      map.epoch();
      map.setFeatures(this.mapFeatures(), this.selectedAnnotationId());
    });
    effect(() => {
      const map = this.map();
      if (!map) return;
      map.epoch();
      map.setDraft(this.draft(), this.tool() === 'OUTLINE');
    });

    effect(() => {
      const click = this.map()?.lastClick();
      if (click) untracked(() => this.onMapClick(click));
    });
  }

  protected selectTool(tool: Tool): void {
    this.tool.set(tool);
    this.draft.set([]);
    this.formProblem.set(null);
  }

  protected focus(annotation: AnnotationSummary): void {
    this.selectedAnnotationId.set(annotation.id);
    const point = focusPoint(annotation.geometry);
    if (point) this.map()?.flyTo({ ...point, height: FOCUS_HEIGHT });
  }

  protected async save(value: AnnotationFormValue): Promise<void> {
    const sceneId = this.scenes.selectedId();
    const kind = this.formKind();
    if (!sceneId || !kind || !this.draftReady()) return;

    this.saving.set(true);
    this.formProblem.set(null);
    const outcome = await this.data.create(sceneId, buildCreateRequest(kind, value, this.draft()));
    this.saving.set(false);

    if (outcome.ok) {
      this.data.reload();
      this.selectedAnnotationId.set(outcome.value.id);
      this.selectTool('select');
    } else {
      this.formProblem.set(problemMessage(outcome.problem));
    }
  }

  protected async createScene(name: string): Promise<void> {
    const box = this.map()?.visibleBbox();
    if (!box) return;
    if (box.west > box.east) {
      this.sceneProblem.set('The view crosses the date line. Move the map and try again.');
      return;
    }
    this.creatingScene.set(true);
    this.sceneProblem.set(null);
    const outcome = await this.scenes.create(name, bboxPolygon(box));
    this.creatingScene.set(false);
    if (!outcome.ok) this.sceneProblem.set(problemMessage(outcome.problem));
  }

  protected resetView(): void {
    this.map()?.flyTo(environment.defaultView);
  }

  protected saveToken(token: string): void {
    this.ionTokenStore.save(token);
    void this.start();
  }

  protected forgetToken(): void {
    this.ionTokenStore.clear();
    void this.start();
  }

  private onMapClick(click: MapClick): void {
    const tool = this.tool();
    if (tool === 'select') {
      this.selectedAnnotationId.set(click.featureId);
      return;
    }
    if (click.longitude === null || click.latitude === null) return;
    const point = { longitude: click.longitude, latitude: click.latitude };
    this.draft.update((points) => (tool === 'OUTLINE' ? [...points, point] : [point]));
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
