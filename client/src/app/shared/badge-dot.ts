import { Component, input } from '@angular/core';
import { HlmBadgeImports } from '@shared/ui/badge';

/**
 * A badge with a coloured status dot. Copied from Sim UI's `badge-08` example
 * (https://github.com/dofu-lab/simui, MIT licence, Copyright (c) 2025 Phuong Tran Dong; notice in
 * THIRD-PARTY-NOTICES.md) and adapted: the dot's colour and the label are inputs instead of fixed
 * "emerald" and "Success", and the dot is a span, since a div is not allowed inside a span.
 */
@Component({
  selector: 'app-badge-dot',
  imports: [HlmBadgeImports],
  template: `
    <span hlmBadge variant="outline" class="gap-1.5">
      <span class="size-1.5 rounded-full" [style.background-color]="color()"></span>
      <span><ng-content /></span>
    </span>
  `,
})
export class BadgeDot {
  readonly color = input.required<string>();
}
