import { Component, input, output, signal } from '@angular/core';
import type { MapMode } from '@map';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmInputImports } from '@shared/ui/input';
import { HlmFieldImports } from '@shared/ui/field';

@Component({
  selector: 'app-ion-token-panel',
  imports: [HlmButtonImports, HlmFieldImports, HlmInputImports],
  template: `
    @if (mode() === 'osm') {
      @if (tilesError()) {
        <p role="status" class="text-destructive">
          3D tiles could not be loaded with the saved token. Check it and try again.
        </p>
      }
      <form hlmFieldGroup (submit)="onSubmit($event)">
        <div hlmField>
          <label hlmFieldLabel for="ion-token">Cesium ion token</label>
          <p hlmFieldDescription>
            Paste a free token to load photorealistic 3D tiles. It stays in this browser only.
          </p>
          <input
            hlmInput
            id="ion-token"
            type="password"
            autocomplete="off"
            [value]="draft()"
            (input)="draft.set(readValue($event))"
          />
        </div>
        <button hlmBtn size="sm" type="submit" [disabled]="!draft().trim()">Load 3D tiles</button>
      </form>
    } @else if (mode() === 'photorealistic') {
      <button hlmBtn variant="ghost" size="sm" type="button" (click)="forgotten.emit()">
        Forget token
      </button>
    }
  `,
})
export class IonTokenPanel {
  readonly mode = input<MapMode | null>(null);
  readonly tilesError = input<string | null>(null);

  readonly saved = output<string>();
  readonly forgotten = output<void>();

  protected readonly draft = signal('');

  protected readValue(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.saved.emit(this.draft());
    this.draft.set('');
  }
}
