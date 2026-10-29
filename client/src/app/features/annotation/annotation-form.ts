import { Component, computed, input, output, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { HlmLabelImports } from '@shared/ui/label';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { AnnotationFormValue, AnnotationKind } from './draft';

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

@Component({
  selector: 'app-annotation-form',
  imports: [FormField, HlmButtonImports, HlmInputImports, HlmLabelImports, HlmTextareaImports],
  template: `
    <form class="flex flex-col gap-2" novalidate (submit)="onSubmit($event)">
      <p class="font-medium">New {{ name() }}</p>
      <p class="text-muted-foreground">{{ hint() }}</p>

      <label hlmLabel for="annotation-title">Title</label>
      <input hlmInput id="annotation-title" autocomplete="off" [formField]="annotationForm.title" />
      @if (annotationForm.title().touched() && annotationForm.title().invalid()) {
        <p class="text-destructive" role="alert">
          {{ firstMessage(annotationForm.title().errors()) }}
        </p>
      }

      @if (kind() === 'NOTE') {
        <label hlmLabel for="annotation-body">Text</label>
        <textarea
          hlmTextarea
          id="annotation-body"
          rows="3"
          [formField]="annotationForm.body"
        ></textarea>
        @if (annotationForm.body().touched() && annotationForm.body().invalid()) {
          <p class="text-destructive" role="alert">
            {{ firstMessage(annotationForm.body().errors()) }}
          </p>
        }
      }

      @if (problem(); as message) {
        <p class="text-destructive" role="alert">{{ message }}</p>
      }

      <div class="flex gap-2">
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
  protected readonly hint = computed(() => HINTS[this.kind()]);

  private readonly model = signal<AnnotationFormValue>({ title: '', body: '' });

  protected readonly annotationForm = form(this.model, (path) => {
    required(path.title, { message: 'Give it a title.' });
    maxLength(path.title, 120, { message: 'Keep the title under 120 characters.' });
    required(path.body, { message: 'A note needs some text.', when: () => this.kind() === 'NOTE' });
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
