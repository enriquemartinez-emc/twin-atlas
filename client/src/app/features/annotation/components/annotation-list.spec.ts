import type { AnnotationSummary } from '@api/index';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnnotationList } from './annotation-list';

const item = (id: string, title: string, kind: AnnotationSummary['kind'], body: string | null) => ({
  id,
  sceneId: 's',
  kind,
  title,
  body,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point' as const, coordinates: [1, 2] },
});

describe('AnnotationList', () => {
  let fixture: ComponentFixture<AnnotationList>;
  const el = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnotationList);
    fixture.componentRef.setInput('items', []);
  });

  it('invites the user to add something when empty', () => {
    fixture.detectChanges();

    expect(el().textContent).toContain('Nothing here yet');
    expect(el().querySelector('ul')).toBeNull();
  });

  it('lists titles with their kind and the text of notes, and marks the selected one', () => {
    fixture.componentRef.setInput('items', [
      item('a', 'Cracked window', 'MARKER', null),
      item('b', 'Leak', 'NOTE', 'Water stain'),
    ]);
    fixture.componentRef.setInput('selectedId', 'b');
    fixture.detectChanges();

    const buttons = el().querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    const text = (button: Element | undefined, selector: string) =>
      button?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    expect(text(buttons[0], '[hlmItemTitle]')).toBe('Cracked window');
    expect(text(buttons[0], '[hlmBadge]')).toBe('Marker');
    expect(text(buttons[0], '[hlmItemDescription]')).toBe('Marker');
    expect(text(buttons[1], '[hlmItemTitle]')).toBe('Leak');
    expect(text(buttons[1], '[hlmBadge]')).toBe('Note');
    expect(text(buttons[1], '[hlmItemDescription]')).toBe('Note Water stain');
    expect(buttons[0]?.getAttribute('aria-current')).toBeNull();
    expect(buttons[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('emits the clicked annotation', () => {
    const second = item('b', 'Leak', 'NOTE', 'Water stain');
    fixture.componentRef.setInput('items', [item('a', 'One', 'MARKER', null), second]);
    const picked: AnnotationSummary[] = [];
    fixture.componentInstance.selected.subscribe((value) => picked.push(value));
    fixture.detectChanges();

    el().querySelectorAll('button')[1]?.click();

    expect(picked).toEqual([second]);
  });

  it('tells the user to zoom in when the page was cut off', () => {
    fixture.componentRef.setInput('truncated', true);
    fixture.detectChanges();

    expect(el().querySelector('[role="status"]')?.textContent).toContain('Zoom in');
  });
});
