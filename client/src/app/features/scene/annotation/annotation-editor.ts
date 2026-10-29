import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import type { AnnotationResponse } from '@api/index';
import { notBlank } from '@shared/not-blank';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { AnnotationFormValue } from './annotation-draft';
import { ProblemAlert } from '@shared/problem-alert';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmTypographyImports } from '@shared/ui/typography';

const NAMES: Record<AnnotationResponse['kind'], string> = {
  MARKER: 'marker',
  NOTE: 'note',
  OUTLINE: 'outline',
};

@Component({
  selector: 'app-annotation-editor',
  imports: [
    FormField,
    ProblemAlert,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmTextareaImports,
    HlmTypographyImports,
  ],
  template: `
    <form hlmFieldGroup novalidate aria-label="Edit annotation" (submit)="onSubmit($event)">
      <p hlmSmall>Edit {{ name() }}</p>

      <div hlmField>
        <label hlmFieldLabel for="edit-title">Title</label>
        <input hlmInput id="edit-title" autocomplete="off" [formField]="editForm.title" />
        @if (editForm.title().touched() && editForm.title().invalid()) {
          <hlm-field-error>{{ firstMessage(editForm.title().errors()) }}</hlm-field-error>
        }
      </div>

      @if (annotation().kind === 'NOTE') {
        <div hlmField>
          <label hlmFieldLabel for="edit-body">Text</label>
          <textarea hlmTextarea id="edit-body" rows="3" [formField]="editForm.body"></textarea>
          @if (editForm.body().touched() && editForm.body().invalid()) {
            <hlm-field-error>{{ firstMessage(editForm.body().errors()) }}</hlm-field-error>
          }
        </div>
      }

      @if (canMove()) {
        <div hlmField>
          @if (moved() && !moving()) {
            <p hlmMuted role="status">A new position is chosen (purple).</p>
          }
          <div hlmField orientation="horizontal">
            <button hlmBtn variant="outline" size="sm" type="button" (click)="moveRequested.emit()">
              {{ moved() || moving() ? 'Choose again' : 'Move on map' }}
            </button>
            @if (moving() || moved()) {
              <button hlmBtn variant="ghost" size="sm" type="button" (click)="moveCancelled.emit()">
                Keep position
              </button>
            }
          </div>
        </div>
      }

      @if (problem(); as message) {
        <app-problem-alert>{{ message }}</app-problem-alert>
        @if (stale()) {
          <button hlmBtn variant="outline" size="sm" type="button" (click)="reloadRequested.emit()">
            Load latest version
          </button>
        }
      }

      <div hlmField orientation="horizontal">
        <button hlmBtn size="sm" type="submit" [disabled]="busy() || !changed()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </button>
        <button hlmBtn variant="ghost" size="sm" type="button" (click)="closed.emit()">
          Close
        </button>
      </div>
    </form>
  `,
})
export class AnnotationEditor {
  readonly annotation = input.required<AnnotationResponse>();
  readonly moving = input(false);
  readonly moved = input(false);
  readonly busy = input(false);
  readonly problem = input<string | null>(null);
  readonly stale = input(false);

  readonly submitted = output<AnnotationFormValue>();
  readonly moveRequested = output<void>();
  readonly moveCancelled = output<void>();
  readonly reloadRequested = output<void>();
  readonly closed = output<void>();

  protected readonly name = computed(() => NAMES[this.annotation().kind]);
  /** Pins can be moved by clicking. Moving an outline's corners is not in the screen yet. */
  protected readonly canMove = computed(() => this.annotation().kind !== 'OUTLINE');

  /** Starts from the stored values, and starts over whenever a newer version arrives. */
  private readonly model = linkedSignal<AnnotationFormValue>(() => ({
    title: this.annotation().title,
    body: this.annotation().body ?? '',
  }));

  protected readonly editForm = form(this.model, (path) => {
    required(path.title, { message: 'Give it a title.' });
    notBlank(path.title, 'Give it a title.');
    maxLength(path.title, 120, { message: 'Keep the title under 120 characters.' });
    required(path.body, {
      message: 'A note needs some text.',
      when: () => this.annotation().kind === 'NOTE',
    });
    validate(path.body, ({ value }) =>
      this.annotation().kind === 'NOTE' && value().trim() === ''
        ? { kind: 'blank', message: 'A note needs some text.' }
        : undefined,
    );
    maxLength(path.body, 2000, { message: 'Keep the text under 2000 characters.' });
  });

  protected readonly changed = computed(() => {
    const { title, body } = this.model();
    const original = this.annotation();
    return (
      this.moved() ||
      title.trim() !== original.title ||
      (original.kind === 'NOTE' && body.trim() !== (original.body ?? ''))
    );
  });

  protected firstMessage(errors: readonly { readonly message?: string }[]): string {
    return errors[0]?.message ?? 'This is not valid.';
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.editForm, async () => {
      this.submitted.emit(this.model());
    });
  }
}
