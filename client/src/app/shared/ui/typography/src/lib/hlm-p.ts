import { Directive } from '@angular/core';
import { classes } from '@shared/ui/utils';

export const hlmP = 'leading-7 [&:not(:first-child)]:mt-6';

@Directive({
  selector: '[hlmP]',
  exportAs: 'hlmP',
})
export class HlmP {
  constructor() {
    classes(() => hlmP);
  }
}
