import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ProblemAlert } from './problem-alert';

@Component({
  imports: [ProblemAlert],
  template: `<app-problem-alert>That title is taken.</app-problem-alert>`,
})
class Host {}

describe('ProblemAlert', () => {
  it('shows the projected message as an alert', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

    expect(alert?.textContent?.trim()).toBe('That title is taken.');
  });
});
