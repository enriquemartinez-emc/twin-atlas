import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import type { SceneResponse } from '@api/index';
import { notBlank } from '@shared/forms/not-blank';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { ProblemAlert } from '@shared/components/problem-alert';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmTypographyImports } from '@shared/ui/typography';

@Component({
  selector: 'app-scene-picker',
  imports: [
    FormField,
    ProblemAlert,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmTypographyImports,
  ],
  template: `
    <section hlmFieldGroup aria-label="Scene">
      <div hlmField>
        <label hlmFieldLabel for="scene-select">Scene</label>
        @if (scenes().length > 0) {
          <select
            hlmInput
            id="scene-select"
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
          <p hlmMuted id="scene-select">
            No scenes yet. Fly to a place and create one from the current view.
          </p>
        }
      </div>

      <form hlmFieldGroup novalidate (submit)="onSubmit($event)">
        <div hlmField>
          <label hlmFieldLabel for="scene-name">New scene covering the current view</label>
          <input hlmInput id="scene-name" autocomplete="off" [formField]="sceneForm.name" />
          @if (sceneForm.name().touched() && sceneForm.name().invalid()) {
            <hlm-field-error>{{ sceneForm.name().errors()[0]?.message }}</hlm-field-error>
          }
        </div>
        @if (problem(); as message) {
          <app-problem-alert>{{ message }}</app-problem-alert>
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
    notBlank(path.name, 'Name the scene.');
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
