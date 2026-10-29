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
  AnnotationEditor,
  AnnotationForm,
  AnnotationList,
  type AnnotationFormValue,
  type AnnotationKind,
  buildCreateRequest,
  buildUpdateRequest,
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
import { ProblemAlert } from '@shared/problems/problem-alert';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

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
    HlmCardImports,
    HlmSeparatorImports,
    HlmToggleGroupImports,
    ProblemAlert,
    ScenePicker,
    AnnotationForm,
    AnnotationEditor,
    AnnotationList,
    IonTokenPanel,
  ],
  template: `
    <div #viewport class="viewport"></div>

    <aside hlmCard class="panel" aria-label="Scene tools">
      <div hlmCardContent class="stack">
        @if (loadError(); as error) {
          <app-problem-alert>{{ error }}</app-problem-alert>
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
          <div hlmSeparator></div>
          <section class="stack" aria-label="Annotations">
            <div
              hlmToggleGroup
              type="single"
              variant="outline"
              size="sm"
              aria-label="Tool"
              [value]="tool()"
              (valueChange)="chooseTool($event)"
            >
              @for (option of tools; track option.tool) {
                <button hlmToggleGroupItem [value]="option.tool">{{ option.label }}</button>
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

            @if (editing(); as annotation) {
              <app-annotation-editor
                [annotation]="annotation"
                [moving]="moving()"
                [moved]="movedTo() !== null"
                [busy]="updating()"
                [problem]="editProblem()"
                [stale]="editStale()"
                (submitted)="saveEdit($event)"
                (moveRequested)="startMove()"
                (moveCancelled)="cancelMove()"
                (reloadRequested)="loadLatest()"
                (closed)="closeEditor()"
              />
            } @else if (tool() === 'select' && data.detailFailed()) {
              <app-problem-alert>Could not load this annotation.</app-problem-alert>
            }

            <app-annotation-list
              [items]="data.items()"
              [selectedId]="selectedAnnotationId()"
              [truncated]="data.truncated()"
              (selected)="focus($event)"
            />

            @if (data.failed()) {
              <app-problem-alert>
                Could not load the annotations.
                <button hlmBtn variant="link" size="sm" type="button" (click)="data.reload()">
                  Try again
                </button>
              </app-problem-alert>
            }
          </section>
        }

        <div hlmSeparator></div>
        <details open>
          <summary>Map</summary>
          <div class="stack">
            @if (map(); as map) {
              <dl>
                <dt>Source</dt>
                <dd>
                  {{
                    map.mode() === 'photorealistic'
                      ? 'Google Photorealistic 3D Tiles'
                      : 'OpenStreetMap'
                  }}
                </dd>
                @if (map.cameraPosition(); as position) {
                  <dt>Camera</dt>
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
      </div>
    </aside>
  `,
  styles: `
    .viewport {
      position: absolute;
      inset: 0;
    }

    /* The floating tool panel: pinned to the left edge, scrolls when it is taller than the screen. */
    .panel {
      position: absolute;
      inset-block: 0.75rem;
      inset-inline-start: 0.75rem;
      z-index: 10;
      width: 20rem;
      max-width: calc(100% - 1.5rem);
      overflow-y: auto;
      background: color-mix(in oklab, var(--card) 95%, transparent);
      backdrop-filter: blur(8px);
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    summary {
      cursor: pointer;
      font-weight: 500;
    }

    /* Chromium does not apply a flex gap to the children of an open <details>, so they sit in a div. */
    details > .stack {
      margin-top: 0.5rem;
    }

    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 0.75rem;
    }

    dt {
      color: var(--muted-foreground);
    }
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
  protected readonly moving = signal(false);
  protected readonly movedTo = signal<LonLat | null>(null);
  protected readonly updating = signal(false);
  protected readonly editProblem = signal<string | null>(null);
  protected readonly editStale = signal(false);
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

  /** The selected annotation, shown for editing in select mode once the server has returned it. */
  protected readonly editing = computed(() =>
    this.tool() === 'select' ? this.data.current() : null,
  );

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
    effect(() => this.data.selectedId.set(this.selectedAnnotationId()));
    // Choosing another annotation drops half-finished edits of the previous one.
    effect(() => {
      this.selectedAnnotationId();
      untracked(() => this.resetEdit());
    });

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

  /** The toggle group reports the chosen value as unknown: only a known tool is acted on. */
  protected chooseTool(value: unknown): void {
    const chosen = TOOLS.find((option) => option.tool === value)?.tool;
    if (chosen && chosen !== this.tool()) this.selectTool(chosen);
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

  protected startMove(): void {
    this.moving.set(true);
    this.movedTo.set(null);
    this.draft.set([]);
  }

  protected cancelMove(): void {
    this.moving.set(false);
    this.movedTo.set(null);
    this.draft.set([]);
  }

  protected closeEditor(): void {
    this.selectedAnnotationId.set(null);
  }

  /** After a conflict: drop the edits and read the annotation again, with its new version. */
  protected loadLatest(): void {
    this.resetEdit();
    this.data.reloadDetail();
    this.data.reload();
  }

  protected async saveEdit(value: AnnotationFormValue): Promise<void> {
    const current = this.data.current();
    if (!current) return;
    const request = buildUpdateRequest(current, value, this.movedTo());
    if (!request) return;

    this.updating.set(true);
    this.editProblem.set(null);
    this.editStale.set(false);
    const outcome = await this.data.update(request);
    this.updating.set(false);

    if (outcome.ok) {
      this.data.reload();
      this.data.reloadDetail();
      this.resetEdit();
      return;
    }
    this.editProblem.set(problemMessage(outcome.problem));
    const code = outcome.problem?.code;
    this.editStale.set(code === 'STALE_VERSION' || code === 'CONCURRENT_MODIFICATION');
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

  private resetEdit(): void {
    this.moving.set(false);
    this.movedTo.set(null);
    this.editProblem.set(null);
    this.editStale.set(false);
    if (this.tool() === 'select') this.draft.set([]);
  }

  private onMapClick(click: MapClick): void {
    const tool = this.tool();
    if (tool === 'select') {
      if (this.moving()) {
        if (click.longitude === null || click.latitude === null) return;
        const point = { longitude: click.longitude, latitude: click.latitude };
        this.movedTo.set(point);
        this.draft.set([point]);
        this.moving.set(false);
        return;
      }
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
