/*
 * Adapted from Sim UI's `select-40` ("Select with description"), MIT, Copyright (c) 2025 Phuong
 * Tran Dong (https://github.com/dofu-lab/simui). The licence is in THIRD-PARTY-NOTICES.md.
 * Changes: the options are scenes, the description is the day the scene was made, and the
 * component reports the id of the scene that was picked.
 */
import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import type { SceneResponse } from '@api/index';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';

@Component({
  selector: 'app-scene-select',
  imports: [DatePipe, HlmFieldImports, HlmSelectImports],
  template: `
    <div hlmField orientation="horizontal">
      <label class="sr-only" for="scene-select">Scene</label>
      <hlm-select [value]="selected()" (valueChange)="chooseScene($event)">
        <hlm-select-trigger buttonId="scene-select" class="[&>button]:w-full">
          <span class="truncate" *hlmSelectValueTemplate="let scene">{{ scene.name }}</span>
        </hlm-select-trigger>
        <hlm-select-content *hlmSelectPortal class="min-w-64">
          <hlm-select-group>
            @for (scene of scenes(); track scene.id) {
              <hlm-select-item [value]="scene">
                <span class="option">
                  {{ scene.name }}
                  <span class="description"
                    >Created {{ scene.createdAt | date: 'mediumDate' }}</span
                  >
                </span>
              </hlm-select-item>
            }
          </hlm-select-group>
        </hlm-select-content>
      </hlm-select>
    </div>
  `,
  styles: `
    hlm-select-trigger {
      display: block;
      width: 15rem;
    }

    @media (max-width: 40rem) {
      hlm-select-trigger {
        width: 8.5rem;
      }
    }

    .option {
      display: flex;
      flex-direction: column;
    }

    .description {
      margin-top: 0.125rem;
      color: var(--muted-foreground);
      font-size: 0.75rem;
    }
  `,
})
export class SceneSelect {
  readonly scenes = input.required<readonly SceneResponse[]>();
  readonly selectedId = input<string | null>(null);

  readonly choose = output<string>();

  protected readonly selected = computed(
    () => this.scenes().find((scene) => scene.id === this.selectedId()) ?? null,
  );

  /** The select reports whatever value an item holds, so only a known scene is acted on. */
  protected chooseScene(value: unknown): void {
    const picked = this.scenes().find((scene) => scene === value);
    if (picked) this.choose.emit(picked.id);
  }
}
