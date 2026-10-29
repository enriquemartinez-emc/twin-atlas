import { NgOptimizedImage } from '@angular/common';
import { Component, input, linkedSignal, output } from '@angular/core';
import type { SceneResponse } from '@api/index';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLink, lucidePlus, lucideSettings } from '@ng-icons/lucide';
import type { MapMode } from '@map/public-api';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { HlmTypographyImports } from '@shared/ui/typography';
import { IonTokenPanel } from './ion-token-panel';
import { NewSceneForm } from './new-scene-form';
import { SceneSelect } from './scene-select';

type DialogState = 'open' | 'closed';

/** The top bar: the app, the scene being worked on, and what belongs to the whole page. */
@Component({
  selector: 'app-scene-bar',
  imports: [
    NgIcon,
    NgOptimizedImage,
    HlmButtonImports,
    HlmDialogImports,
    HlmTooltipImports,
    HlmTypographyImports,
    IonTokenPanel,
    NewSceneForm,
    SceneSelect,
  ],
  providers: [provideIcons({ lucideLink, lucidePlus, lucideSettings })],
  template: `
    <header>
      <img ngSrc="favicon.svg" width="22" height="22" alt="" />
      <h1 hlmLarge>Twin Atlas</h1>

      <div class="scene">
        @if (scenes().length > 0) {
          <app-scene-select
            [scenes]="scenes()"
            [selectedId]="selectedId()"
            (choose)="choose.emit($event)"
          />
        } @else {
          <span hlmMuted>No scenes yet. Fly to a place, then create one.</span>
        }

        <hlm-dialog [state]="newSceneState()" (stateChanged)="newSceneState.set($event)">
          <button
            hlmBtn
            hlmDialogTrigger
            size="sm"
            type="button"
            [variant]="scenes().length > 0 ? 'outline' : 'default'"
          >
            <ng-icon name="lucidePlus" />
            New scene
          </button>
          <hlm-dialog-content *hlmDialogPortal="let ctx">
            <hlm-dialog-header>
              <h2 hlmDialogTitle>New scene</h2>
              <p hlmDialogDescription>
                A scene is an area of the map. Annotations must fall inside it.
              </p>
            </hlm-dialog-header>
            <app-new-scene-form
              [canCreate]="canCreate()"
              [busy]="busy()"
              [problem]="problem()"
              (create)="create.emit($event)"
            />
          </hlm-dialog-content>
        </hlm-dialog>
      </div>

      <div class="actions">
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          type="button"
          hlmTooltip="Copy a link to this scene and place"
          (click)="copyLink.emit()"
        >
          <ng-icon name="lucideLink" />
          <span class="sr-only" aria-live="polite">{{ linkLabel() }}</span>
        </button>

        <hlm-dialog>
          <button
            hlmBtn
            hlmDialogTrigger
            variant="ghost"
            size="icon"
            type="button"
            hlmTooltip="Map settings"
          >
            <ng-icon name="lucideSettings" />
            <span class="sr-only">Map settings</span>
          </button>
          <hlm-dialog-content *hlmDialogPortal="let ctx">
            <hlm-dialog-header>
              <h2 hlmDialogTitle>Map settings</h2>
              <p hlmDialogDescription>The picture the map is drawn with.</p>
            </hlm-dialog-header>
            <app-ion-token-panel
              [mode]="mapMode()"
              [tilesError]="tilesError()"
              (saved)="tokenSaved.emit($event)"
              (forgotten)="tokenForgotten.emit()"
            />
          </hlm-dialog-content>
        </hlm-dialog>
      </div>
    </header>
  `,
  styles: `
    header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.375rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .scene {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      margin-inline-start: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 0.25rem;
      margin-inline-start: auto;
    }

    @media (max-width: 40rem) {
      h1 {
        display: none;
      }

      .scene {
        margin-inline-start: 0;
      }
    }
  `,
})
export class SceneBar {
  readonly scenes = input.required<readonly SceneResponse[]>();
  readonly selectedId = input<string | null>(null);
  readonly canCreate = input(false);
  readonly busy = input(false);
  readonly problem = input<string | null>(null);
  readonly linkLabel = input('Copy link');
  readonly mapMode = input<MapMode | null>(null);
  readonly tilesError = input<string | null>(null);

  readonly choose = output<string>();
  readonly create = output<string>();
  readonly copyLink = output<void>();
  readonly tokenSaved = output<string>();
  readonly tokenForgotten = output<void>();

  /** Closes by itself once another scene is open, which is what creating one leads to. */
  protected readonly newSceneState = linkedSignal<DialogState>(() => {
    this.selectedId();
    return 'closed';
  });
}
