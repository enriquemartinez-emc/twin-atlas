import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, signal } from '@angular/core';

const LABELS = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Could not copy',
} as const;

/** Copies the address, which carries the scene and the annotation, and says whether it worked. */
export function linkCopy() {
  const document = inject(DOCUMENT);
  const state = signal<keyof typeof LABELS>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(document.location.href);
      state.set('copied');
    } catch {
      state.set('failed');
    }
    clearTimeout(timer);
    timer = setTimeout(() => state.set('idle'), 2500);
  }

  return { label: computed(() => LABELS[state()]), copy };
}
