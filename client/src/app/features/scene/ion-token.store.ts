import { Service, signal } from '@angular/core';

const STORAGE_KEY = 'twinatlas.cesiumIonToken';

/**
 * Keeps the viewer's own Cesium ion token in this browser's localStorage. It is entered once in the
 * UI and never committed or sent to our API. Storage can be unavailable (private window, blocked
 * site data), so every access is guarded and the app works without it.
 */
@Service()
export class IonTokenStore {
  private readonly state = signal<string | null>(this.read());
  readonly token = this.state.asReadonly();

  save(token: string): void {
    const trimmed = token.trim();
    if (!trimmed) {
      this.clear();
      return;
    }
    this.write(trimmed);
    this.state.set(trimmed);
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable: nothing persisted, nothing to remove
    }
    this.state.set(null);
  }

  private read(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      // storage unavailable: the token stays in memory for this session only
    }
  }
}
