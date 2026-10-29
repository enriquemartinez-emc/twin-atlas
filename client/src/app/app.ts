import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    main {
      height: 100dvh;
      background: var(--background);
      color: var(--foreground);
    }
  `,
})
export class App {}
