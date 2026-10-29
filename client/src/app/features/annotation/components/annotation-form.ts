import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import { notBlank } from '@shared/forms/not-blank';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { AnnotationFormValue, AnnotationKind } from '../annotation-draft';
import { ProblemAlert } from '@shared/components/problem-alert';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmTypographyImports } from '@shared/ui/typography';

const NAMES: Record<AnnotationKind, string> = {
  MARKER: 'marker',
  NOTE: 'note',
  OUTLINE: 'outline',
};

const HINTS: Record<AnnotationKind, string> = {
  MARKER: 'Click the map to place the marker.',
  NOTE: 'Click the map to place the note.',
  OUTLINE: 'Click the map to add corners (at least three), then save.',
};

/** What to say once the shape is good enough to save, instead of asking for it again. */
const PLACED_HINTS: Record<AnnotationKind, string> = {
  MARKER: 'Placed. Add a title and save, or click again to move it.',
  NOTE: 'Placed. Add a title and the text, then save, or click again to move it.',
  OUTLINE: 'That is enough corners. Add more, or give it a title and save.',
};

@Component({
  selector: 'app-annotation-form',
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
    <form hlmFieldGroup novalidate (submit)="onSubmit($event)">
      <div>
        <p hlmSmall>New {{ name() }}</p>
        <p hlmMuted>{{ hint() }}</p>
      </div>

      <div hlmField>
        <label hlmFieldLabel for="annotation-title">Title</label>
        <input
          hlmInput
          id="annotation-title"
          autocomplete="off"
          [formField]="annotationForm.title"
        />
        @if (annotationForm.title().touched() && annotationForm.title().invalid()) {
          <hlm-field-error>{{ firstMessage(annotationForm.title().errors()) }}</hlm-field-error>
        }
      </div>

      @if (kind() === 'NOTE') {
        <div hlmField>
          <label hlmFieldLabel for="annotation-body">Text</label>
          <textarea
            hlmTextarea
            id="annotation-body"
            rows="3"
            [formField]="annotationForm.body"
          ></textarea>
          @if (annotationForm.body().touched() && annotationForm.body().invalid()) {
            <hlm-field-error>{{ firstMessage(annotationForm.body().errors()) }}</hlm-field-error>
          }
        </div>
      }

      @if (problem(); as message) {
        <app-problem-alert>{{ message }}</app-problem-alert>
      }

      <div hlmField orientation="horizontal">
        <button hlmBtn size="sm" type="submit" [disabled]="busy() || !ready()">
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
        <button hlmBtn variant="ghost" size="sm" type="button" (click)="cancelled.emit()">
          Cancel
        </button>
      </div>
    </form>
  `,
})
export class AnnotationForm {
  readonly kind = input.required<AnnotationKind>();
  /** The draft on the map has enough points to be saved. */
  readonly ready = input(false);
  readonly busy = input(false);
  /** A readable message for the last failed save, from the server's problem code. */
  readonly problem = input<string | null>(null);

  readonly submitted = output<AnnotationFormValue>();
  readonly cancelled = output<void>();

  protected readonly name = computed(() => NAMES[this.kind()]);
  protected readonly hint = computed(() =>
    this.ready() ? PLACED_HINTS[this.kind()] : HINTS[this.kind()],
  );

  private readonly model = signal<AnnotationFormValue>({ title: '', body: '' });

  protected readonly annotationForm = form(this.model, (path) => {
    required(path.title, { message: 'Give it a title.' });
    notBlank(path.title, 'Give it a title.');
    maxLength(path.title, 120, { message: 'Keep the title under 120 characters.' });
    required(path.body, { message: 'A note needs some text.', when: () => this.kind() === 'NOTE' });
    validate(path.body, ({ value }) =>
      this.kind() === 'NOTE' && value().trim() === ''
        ? { kind: 'blank', message: 'A note needs some text.' }
        : undefined,
    );
    maxLength(path.body, 2000, { message: 'Keep the text under 2000 characters.' });
  });

  protected firstMessage(errors: readonly { readonly message?: string }[]): string {
    return errors[0]?.message ?? 'This is not valid.';
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.annotationForm, async () => {
      this.submitted.emit(this.model());
    });
  }
}
