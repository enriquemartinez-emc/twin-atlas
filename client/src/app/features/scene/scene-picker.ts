import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import type { SceneResponse } from '@api/index';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { HlmLabelImports } from '@shared/ui/label';

@Component({
  selector: 'app-scene-picker',
  imports: [FormField, HlmButtonImports, HlmInputImports, HlmLabelImports],
  template: `
    <section class="flex flex-col gap-2" aria-label="Scene">
      <label hlmLabel for="scene-select">Scene</label>
      @if (scenes().length > 0) {
        <select
          id="scene-select"
          class="border-input bg-background h-9 rounded-md border px-2"
          [value]="selectedId() ?? ''"
          (change)="choose.emit(readValue($event))"
        >
          @for (scene of scenes(); track scene.id) {
            <option [value]="scene.id" [selected]="scene.id === selectedId()">
              {{ scene.name }}
            </option>
          }
        </select>
      } @else {
        <p class="text-muted-foreground" id="scene-select">
          No scenes yet. Fly to a place and create one from the current view.
        </p>
      }

      <form class="flex flex-col gap-2" novalidate (submit)="onSubmit($event)">
        <label hlmLabel for="scene-name">New scene covering the current view</label>
        <input hlmInput id="scene-name" autocomplete="off" [formField]="sceneForm.name" />
        @if (sceneForm.name().touched() && sceneForm.name().invalid()) {
          <p class="text-destructive" role="alert">{{ sceneForm.name().errors()[0]?.message }}</p>
        }
        @if (problem(); as message) {
          <p class="text-destructive" role="alert">{{ message }}</p>
        }
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="submit"
          [disabled]="busy() || !canCreate()"
        >
          {{ busy() ? 'Creating…' : 'Create scene from this view' }}
        </button>
      </form>
    </section>
  `,
})
export class ScenePicker {
  readonly scenes = input.required<readonly SceneResponse[]>();
  readonly selectedId = input<string | null>(null);
  /** The map has reported a view to build the scene from. */
  readonly canCreate = input(false);
  readonly busy = input(false);
  readonly problem = input<string | null>(null);

  readonly choose = output<string>();
  readonly create = output<string>();

  private readonly model = signal({ name: '' });

  protected readonly sceneForm = form(this.model, (path) => {
    required(path.name, { message: 'Name the scene.' });
    maxLength(path.name, 120, { message: 'Keep the name under 120 characters.' });
  });

  protected readValue(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.sceneForm, async () => {
      this.create.emit(this.model().name.trim());
      this.sceneForm().reset({ name: '' }); // also clears touched, so no stale error shows
    });
  }
}
