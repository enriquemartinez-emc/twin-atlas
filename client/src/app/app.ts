import { NgOptimizedImage } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmTypographyImports } from '@shared/ui/typography';

@Component({
  imports: [NgOptimizedImage, RouterOutlet, HlmTypographyImports],
  selector: 'app-root',
  template: `
    <div class="shell">
      <header>
        <img ngSrc="favicon.svg" width="22" height="22" alt="" />
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
      gap: 0.5rem;
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
