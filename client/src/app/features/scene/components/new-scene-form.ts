import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { notBlank } from '@shared/forms/not-blank';
import { ProblemAlert } from '@shared/components/problem-alert';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInputImports } from '@shared/ui/input';

/** Names a new scene that covers whatever the map shows right now. */
@Component({
  selector: 'app-new-scene-form',
  imports: [FormField, ProblemAlert, HlmButtonImports, HlmFieldImports, HlmInputImports],
  template: `
    <form hlmFieldGroup novalidate (submit)="onSubmit($event)">
      <div hlmField>
        <label hlmFieldLabel for="scene-name">Name</label>
        <p hlmFieldDescription>The new scene covers the part of the map you are looking at.</p>
        <input hlmInput id="scene-name" autocomplete="off" [formField]="sceneForm.name" />
        @if (sceneForm.name().touched() && sceneForm.name().invalid()) {
          <hlm-field-error>{{ sceneForm.name().errors()[0]?.message }}</hlm-field-error>
        }
      </div>
      @if (problem(); as message) {
        <app-problem-alert>{{ message }}</app-problem-alert>
      }
      <button hlmBtn size="sm" type="submit" [disabled]="busy() || !canCreate()">
        {{ busy() ? 'Creating…' : 'Create scene from this view' }}
      </button>
    </form>
  `,
})
export class NewSceneForm {
  readonly canCreate = input(false);
  readonly busy = input(false);
  readonly problem = input<string | null>(null);

  readonly create = output<string>();

  private readonly model = signal({ name: '' });

  protected readonly sceneForm = form(this.model, (path) => {
    required(path.name, { message: 'Name the scene.' });
    notBlank(path.name, 'Name the scene.');
    maxLength(path.name, 120, { message: 'Keep the name under 120 characters.' });
  });

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.sceneForm, async () => {
      this.create.emit(this.model().name.trim());
      this.sceneForm().reset({ name: '' }); // also clears touched, so no stale error shows
    });
  }
}
