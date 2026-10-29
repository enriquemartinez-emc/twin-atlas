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
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { AnnotationSummary } from '@api/index';
import { environment } from '@env/environment';
import {
  AnnotationEditor,
  AnnotationForm,
  AnnotationList,
  type AnnotationFormValue,
  type AnnotationKind,
  annotationData,
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
import { IonTokenPanel } from './components/ion-token-panel';
import { IonTokenStore } from './ion-token-store';
import { ScenePicker } from './components/scene-picker';
import { SceneData } from './scene-data';
import { ProblemAlert } from '@shared/components/problem-alert';
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
  selector: 'app-scene',
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
          [selectedId]="selectedSceneId()"
          [canCreate]="canCreateScene()"
          [busy]="creatingScene()"
          [problem]="sceneProblem()"
          (choose)="chooseScene($event)"
          (create)="createScene($event)"
        />

        @if (selectedSceneId()) {
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
export class Scene {
  private readonly loadMap = injectAsync(() =>
    import('@map/map.service').then((m) => m.MapService),
  );
  /** From the URL: `/scenes/:sceneId`. Without it the scene used last is shown. */
  readonly sceneId = input<string>();
  /** From the URL: `?annotation=<id>`. */
  readonly annotation = input<string>();

  private readonly router = inject(Router);
  private readonly ionTokenStore = inject(IonTokenStore);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private destroyed = false;

  protected readonly scenes = inject(SceneData);
  protected readonly tools = TOOLS;

  protected readonly map = signal<MapService | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly selectedSceneId = computed(() => this.sceneId() ?? this.scenes.defaultId());
  /** Follows the URL, and takes the user's choice at once while the URL catches up. */
  protected readonly selectedAnnotationId = linkedSignal<string | null>(
    () => this.annotation() ?? null,
  );
  private readonly view = computed(() => this.map()?.visibleBbox() ?? null);
  protected readonly data = annotationData(
    this.selectedSceneId,
    this.view,
    this.selectedAnnotationId,
  );

  protected readonly tool = signal<Tool>('select');
  /** Cleared when the tool changes, and when another annotation is chosen in select mode. */
  protected readonly draft = linkedSignal<
    { readonly tool: Tool; readonly id: string | null },
    readonly LonLat[]
  >({
    source: () => ({ tool: this.tool(), id: this.selectedAnnotationId() }),
    computation: (source, previous) =>
      source.tool === 'select' || previous?.source.tool !== source.tool
        ? []
        : (previous?.value ?? []),
  });
  protected readonly saving = signal(false);
  protected readonly formProblem = signal<string | null>(null);
  protected readonly updating = signal(false);

  // Half-finished edits belong to one annotation: choosing another one starts them afresh.
  protected readonly moving = linkedSignal(() => {
    this.selectedAnnotationId();
    return false;
  });
  protected readonly movedTo = linkedSignal<LonLat | null>(() => {
    this.selectedAnnotationId();
    return null;
  });
  protected readonly editProblem = linkedSignal<string | null>(() => {
    this.selectedAnnotationId();
    return null;
  });
  protected readonly editStale = linkedSignal(() => {
    this.selectedAnnotationId();
    return false;
  });
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

    // The Cesium map is an imperative API, so what is known is pushed to it by effects.
    // `epoch` re-runs them after the map is rebuilt.
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

    // Map clicks arrive as a signal from the Cesium wrapper and are turned into actions here.
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
    this.selectAnnotation(annotation.id);
    const point = focusPoint(annotation.geometry);
    if (point) this.map()?.flyTo({ ...point, height: FOCUS_HEIGHT });
  }

  protected async save(value: AnnotationFormValue): Promise<void> {
    const sceneId = this.selectedSceneId();
    const kind = this.formKind();
    if (!sceneId || !kind || !this.draftReady()) return;

    this.saving.set(true);
    this.formProblem.set(null);
    const outcome = await this.data.create(sceneId, buildCreateRequest(kind, value, this.draft()));
    this.saving.set(false);

    if (outcome.ok) {
      this.data.reload();
      this.selectAnnotation(outcome.value.id);
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
    this.selectAnnotation(null);
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
    if (outcome.ok) void this.router.navigate(['/scenes', outcome.value.id]);
    else this.sceneProblem.set(problemMessage(outcome.problem));
  }

  protected chooseScene(id: string): void {
    this.scenes.remember(id);
    void this.router.navigate(['/scenes', id]);
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

  /** The user's choice shows at once, and goes into the URL so the link can be shared. */
  private selectAnnotation(id: string | null): void {
    this.selectedAnnotationId.set(id);
    void this.router.navigate([], {
      queryParams: { annotation: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
      this.selectAnnotation(click.featureId);
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
