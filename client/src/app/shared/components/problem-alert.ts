import { Component } from '@angular/core';
import { HlmAlertImports } from '@shared/ui/alert';

/** A message the user must see, such as a refused save. The text is projected. */
@Component({
  selector: 'app-problem-alert',
  imports: [HlmAlertImports],
  template: `
    <div hlmAlert variant="destructive">
      <div hlmAlertDescription><ng-content /></div>
    </div>
  `,
})
export class ProblemAlert {}
