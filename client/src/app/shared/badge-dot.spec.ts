import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BadgeDot } from './badge-dot';

@Component({
  imports: [BadgeDot],
  template: `<app-badge-dot color="rgb(37, 99, 235)">Marker</app-badge-dot>`,
})
class Host {}

describe('BadgeDot', () => {
  it('shows its label next to a dot of the given colour', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[hlmBadge]')?.textContent?.trim()).toBe('Marker');
    const dot = el.querySelector<HTMLElement>('.rounded-full');
    expect(dot?.style.backgroundColor).toBe('rgb(37, 99, 235)');
  });
});
