import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmTypographyImports } from '@shared/ui/typography';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, HlmButtonImports, HlmTypographyImports],
  template: `
    <section>
      <h2 hlmLarge>This page does not exist</h2>
      <p hlmMuted>Check the address, or go back to the scenes.</p>
      <a hlmBtn variant="outline" routerLink="/scenes">Back to the scenes</a>
    </section>
  `,
  styles: `
    section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 2rem;
    }
  `,
})
export class NotFound {}
