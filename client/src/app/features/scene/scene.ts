import { DOCUMENT } from '@angular/common';
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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePanelRightClose, lucidePanelRightOpen } from '@ng-icons/lucide';
import {
  AnnotationEditor,
  AnnotationForm,
  AnnotationList,
  type AnnotationFormValue,
  annotationData,
  buildCreateRequest,
  buildUpdateRequest,
  focusPoint,
  isDraftReady,
  toMapFeature,
} from '@features/annotation';
import type { LonLat, MapClick, MapViewer } from '@map';
import { bboxPolygon } from '@map';
import { problemMessage } from '@app/core/problems/problem-message';
import { ProblemAlert } from '@shared/components/problem-alert';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { MapStatus } from './components/map-status';
import { SceneBar } from './components/scene-bar';
import { ToolRail, type Tool } from './components/tool-rail';
import { IonTokenStore } from './ion-token-store';
import { SceneData } from './scene-data';
import { toolHint } from './tool-hint';

const LINK_LABELS = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Could not copy',
} as const;

const FOCUS_HEIGHT = 250;

@Component({
  selector: 'app-scene',
  imports: [
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmTooltipImports,
    ProblemAlert,
    AnnotationForm,
    AnnotationEditor,
    AnnotationList,
    MapStatus,
    SceneBar,
    ToolRail,
  ],
  providers: [provideIcons({ lucidePanelRightClose, lucidePanelRightOpen })],
  template: `
    <app-scene-bar
      [scenes]="scenes.scenes()"
      [selectedId]="selectedSceneId()"
      [canCreate]="canCreateScene()"
      [busy]="creatingScene()"
      [problem]="sceneProblem()"
      [linkLabel]="linkLabel()"
      [mapMode]="map()?.mode() ?? null"
      [tilesError]="map()?.tilesError() ?? null"
      (choose)="chooseScene($event)"
      (create)="createScene($event)"
      (copyLink)="copyLink()"
      (tokenSaved)="saveToken($event)"
      (tokenForgotten)="forgetToken()"
    />

    <div class="stage">
      <div #viewport class="viewport"></div>

      @if (selectedSceneId()) {
        <app-tool-rail class="rail" [tool]="tool()" (chosen)="selectTool($event)" />
      }

      @if (hint(); as text) {
        <p class="hint" role="status">{{ text }}</p>
      }

      <app-map-status
        class="status"
        [mode]="map()?.mode() ?? null"
        [position]="map()?.cameraPosition() ?? null"
        [failed]="!!loadError()"
        (resetRequested)="resetView()"
      />

      <button
        hlmBtn
        class="show-panel"
        variant="outline"
        size="icon"
        type="button"
        hlmTooltip="Show the panel"
        position="left"
        [hidden]="panelOpen()"
        (click)="panelOpen.set(true)"
      >
        <ng-icon name="lucidePanelRightOpen" />
        <span class="sr-only">Show panel</span>
      </button>

      <aside hlmCard class="panel" aria-label="Places" [hidden]="!panelOpen()">
        <div hlmCardContent class="stack">
          <button
            hlmBtn
            class="hide-panel"
            variant="ghost"
            size="icon-sm"
            type="button"
            hlmTooltip="Hide the panel"
            position="left"
            (click)="panelOpen.set(false)"
          >
            <ng-icon name="lucidePanelRightClose" />
            <span class="sr-only">Hide panel</span>
          </button>

          @if (loadError(); as error) {
            <app-problem-alert>{{ error }}</app-problem-alert>
          }

          @if (selectedSceneId()) {
            @if (formKind(); as kind) {
              <app-annotation-form
                [kind]="kind"
                [ready]="draftReady()"
                [busy]="saving()"
                [problem]="formProblem()"
                (submitted)="save($event)"
                (cancelled)="selectTool('select')"
              />
            } @else if (editing(); as annotation) {
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
            } @else {
              @if (data.detailFailed()) {
                <app-problem-alert>Could not load this annotation.</app-problem-alert>
              }
              <app-annotation-list
                [items]="data.items()"
                [selectedId]="selectedAnnotationId()"
                [truncated]="data.truncated()"
                [loading]="data.loading()"
                (selected)="focus($event)"
              />
            }

            @if (data.failed()) {
              <app-problem-alert>
                Could not load the annotations.
                <button hlmBtn variant="link" size="sm" type="button" (click)="data.reload()">
                  Try again
                </button>
              </app-problem-alert>
            }
          } @else {
            <div hlmEmpty>
              <div hlmEmptyHeader>
                <p hlmEmptyTitle>No scene open</p>
                <p hlmEmptyDescription>
                  Choose a scene in the top bar, or create one from what the map shows.
                </p>
              </div>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .stage {
      position: relative;
      flex: 1;
      min-height: 0;
    }

    .viewport {
      position: absolute;
      inset: 0;
    }

    .rail {
      position: absolute;
      inset-block-start: 0.75rem;
      inset-inline-start: 0.75rem;
      z-index: 10;
    }

    .status {
      position: absolute;
      inset-block-start: 0.75rem;
      inset-inline-start: 4.25rem;
      z-index: 10;
    }

    .hint {
      position: absolute;
      inset-block-end: 2.5rem;
      inset-inline-start: 50%;
      transform: translateX(-50%);
      z-index: 10;
      max-width: calc(100% - 2rem);
      margin: 0;
      padding: 0.375rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--card);
      font-size: 0.875rem;
    }

    /* The floating panel: pinned to the right edge, scrolls when it is taller than the screen. */
    .panel {
      position: absolute;
      inset-block: 0.75rem;
      inset-inline-end: 0.75rem;
      z-index: 10;
      width: 21rem;
      max-width: calc(100% - 1.5rem);
      overflow-y: auto;
      background: var(--card);
    }

    .panel[hidden],
    .show-panel[hidden] {
      display: none;
    }

    .show-panel {
      position: absolute;
      inset-block-start: 0.75rem;
      inset-inline-end: 0.75rem;
      z-index: 10;
    }

    .hide-panel {
      position: absolute;
      inset-block-start: 0.5rem;
      inset-inline-end: 0.5rem;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* On a phone the panel is a sheet at the bottom, the tools run along the top. */
    @media (max-width: 40rem) {
      .panel {
        inset-block: auto 0.5rem;
        inset-inline: 0.5rem;
        width: auto;
        max-width: none;
        max-height: 50dvh;
      }

      .status {
        inset-block-start: 4rem;
        inset-inline-start: 0.75rem;
      }

      .hint {
        inset-block-end: auto;
        inset-block-start: 7rem;
      }

      .show-panel {
        inset-block: auto 0.75rem;
      }
    }
  `,
})
export class Scene {
  private readonly loadMap = injectAsync(() => import('@map/map-viewer').then((m) => m.MapViewer));
  readonly sceneId = input<string>();
  readonly annotation = input<string>();

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly ionTokenStore = inject(IonTokenStore);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private destroyed = false;

  protected readonly scenes = inject(SceneData);

  protected readonly map = signal<MapViewer | null>(null);
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

  protected readonly panelOpen = signal(true);
  protected readonly linkState = signal<'idle' | 'copied' | 'failed'>('idle');
  protected readonly linkLabel = computed(() => LINK_LABELS[this.linkState()]);
  private linkTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly tool = signal<Tool>('select');
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

  protected readonly formKind = computed(() => {
    const tool = this.tool();
    return tool === 'select' ? null : tool;
  });
  protected readonly draftReady = computed(() => {
    const kind = this.formKind();
    return kind !== null && isDraftReady(kind, this.draft());
  });

  protected readonly editing = computed(() =>
    this.tool() === 'select' ? this.data.current() : null,
  );

  /** A scene is built from the visible area, so the map must have reported one. */
  protected readonly canCreateScene = computed(() => !!this.map()?.visibleBbox());

  protected readonly hint = computed(() =>
    this.selectedSceneId()
      ? toolHint({ tool: this.tool(), points: this.draft().length, moving: this.moving() })
      : null,
  );

  private readonly mapFeatures = computed(() => this.data.items().map(toMapFeature));

  constructor() {
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.linkTimer);
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

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.document.location.href);
      this.linkState.set('copied');
    } catch {
      this.linkState.set('failed');
    }
    clearTimeout(this.linkTimer);
    this.linkTimer = setTimeout(() => this.linkState.set('idle'), 2500);
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
