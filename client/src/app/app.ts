import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `
    <div class="bg-background text-foreground flex h-dvh flex-col">
      <header class="border-border flex items-center border-b px-4 py-2">
        <h1 class="text-lg font-semibold">{{ title() }}</h1>
      </header>
      <main class="relative min-h-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  protected readonly title = signal('Twin Atlas');
}
