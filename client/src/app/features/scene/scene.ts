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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { AnnotationSummary } from '@api/index';
import { environment } from '@env/environment';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePanelRightClose, lucidePanelRightOpen } from '@ng-icons/lucide';
import { AnnotationEditor } from './annotation/annotation-editor';
import { AnnotationForm } from './annotation/annotation-form';
import { AnnotationList } from './annotation/annotation-list';
import { focusPoint, toMapFeature } from './annotation/annotation-draft';
import type { MapClick } from '@map/feature.model';
import type { MapViewer } from '@map/map-viewer';
import { ProblemAlert } from '@shared/problem-alert';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { MapStatus } from './map-status';
import { SceneBar } from './scene-bar/scene-bar';
import { ToolRail } from './tools/tool-rail';
import { drawingState } from './tools/drawing-state';
import { editState } from './annotation/edit-state';
import { IonTokenStore } from './scene-bar/ion-token-store';
import { linkCopy } from './link-copy';
import { SceneData } from './scene-data';
import { sceneCreation } from './scene-creation';
import { sceneWorkspace } from './scene-workspace';
import { toolHint } from './tools/tool-hint';

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
      [selectedId]="workspace.sceneId()"
      [canCreate]="creation.canCreate()"
      [busy]="creation.busy()"
      [problem]="creation.problem()"
      [linkLabel]="link.label()"
      [mapMode]="map()?.mode() ?? null"
      [tilesError]="map()?.tilesError() ?? null"
      (choose)="chooseScene($event)"
      (create)="creation.create($event)"
      (copyLink)="link.copy()"
      (tokenSaved)="saveToken($event)"
      (tokenForgotten)="forgetToken()"
    />

    <div class="stage">
      <div #viewport class="viewport"></div>

      @if (workspace.sceneId()) {
        <app-tool-rail class="rail" [tool]="draw.tool()" (chosen)="draw.selectTool($event)" />
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

          @if (workspace.sceneId()) {
            @if (draw.formKind(); as kind) {
              <app-annotation-form
                [kind]="kind"
                [ready]="draw.ready()"
                [busy]="draw.saving()"
                [problem]="draw.problem()"
                (submitted)="draw.save($event)"
                (cancelled)="draw.selectTool('select')"
              />
            } @else if (edit.annotation(); as annotation) {
              <app-annotation-editor
                [annotation]="annotation"
                [moving]="edit.moving()"
                [moved]="edit.movedTo() !== null"
                [busy]="edit.updating()"
                [problem]="edit.problem()"
                [stale]="edit.stale()"
                (submitted)="edit.save($event)"
                (moveRequested)="edit.start()"
                (moveCancelled)="edit.cancelMove()"
                (reloadRequested)="edit.loadLatest()"
                (closed)="edit.close()"
              />
            } @else {
              @if (workspace.data.detailFailed()) {
                <app-problem-alert>Could not load this annotation.</app-problem-alert>
              }
              <app-annotation-list
                [items]="workspace.data.items()"
                [selectedId]="workspace.annotationId()"
                [truncated]="workspace.data.truncated()"
                [loading]="workspace.data.loading()"
                (selected)="focus($event)"
              />
            }

            @if (workspace.data.failed()) {
              <app-problem-alert>
                Could not load the annotations.
                <button
                  hlmBtn
                  variant="link"
                  size="sm"
                  type="button"
                  (click)="workspace.data.reload()"
                >
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
  private readonly ionTokenStore = inject(IonTokenStore);
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private destroyed = false;

  protected readonly scenes = inject(SceneData);
  protected readonly map = signal<MapViewer | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly panelOpen = signal(true);

  private readonly view = computed(() => this.map()?.visibleBbox() ?? null);
  protected readonly workspace = sceneWorkspace(this.sceneId, this.annotation, this.view);
  protected readonly draw = drawingState(this.workspace);
  protected readonly edit = editState(this.workspace, this.draw);
  protected readonly creation = sceneCreation(this.view);
  protected readonly link = linkCopy();

  protected readonly hint = computed(() =>
    this.workspace.sceneId()
      ? toolHint({
          tool: this.draw.tool(),
          points: this.draw.draft().length,
          moving: this.edit.moving(),
        })
      : null,
  );

  private readonly mapFeatures = computed(() => this.workspace.data.items().map(toMapFeature));

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
      map.setFeatures(this.mapFeatures(), this.workspace.annotationId());
    });
    effect(() => {
      const map = this.map();
      if (!map) return;
      map.epoch();
      map.setDraft(this.draw.draft(), this.draw.tool() === 'OUTLINE');
    });

    effect(() => {
      const click = this.map()?.lastClick();
      if (click) untracked(() => this.onMapClick(click));
    });
  }

  protected focus(annotation: AnnotationSummary): void {
    this.workspace.selectAnnotation(annotation.id);
    const point = focusPoint(annotation.geometry);
    if (point) this.map()?.flyTo({ ...point, height: FOCUS_HEIGHT });
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

  /** What a click on the map means depends on the tool in hand and on a move being awaited. */
  private onMapClick(click: MapClick): void {
    const point =
      click.longitude === null || click.latitude === null
        ? null
        : { longitude: click.longitude, latitude: click.latitude };
    if (this.draw.tool() !== 'select') {
      if (point) this.draw.addPoint(point);
    } else if (this.edit.moving()) {
      if (point) this.edit.chooseSpot(point);
    } else {
      this.workspace.selectAnnotation(click.featureId);
    }
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
