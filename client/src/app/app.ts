import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmTypographyImports } from '@shared/ui/typography';

@Component({
  imports: [RouterOutlet, HlmTypographyImports],
  selector: 'app-root',
  template: `
    <div class="shell">
      <header>
        <h1 hlmLarge>{{ title() }}</h1>
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--background);
      color: var(--foreground);
    }

    header {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    main {
      position: relative;
      flex: 1;
      min-height: 0;
    }
  `,
})
export class App {
  protected readonly title = signal('Twin Atlas');
}
