import { Component } from '@angular/core';
import { HlmAlertImports } from '@shared/ui/alert';

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
