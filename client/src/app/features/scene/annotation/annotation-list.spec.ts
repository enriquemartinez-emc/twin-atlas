import type { AnnotationSummary } from '@api/index';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PALETTE } from '@features/scene/map/palette';
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

    const buttons = el().querySelectorAll<HTMLButtonElement>('li button');
    expect(buttons).toHaveLength(2);
    const text = (button: Element | undefined, selector: string) =>
      button?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
    expect(text(buttons[0], '[hlmItemTitle]')).toBe('Cracked window');
    expect(text(buttons[0], '[hlmItemDescription]')).toBe('Marker');
    expect(text(buttons[1], '[hlmItemTitle]')).toBe('Leak');
    expect(text(buttons[1], '[hlmItemDescription]')).toBe('Water stain');
    expect(buttons[0]?.getAttribute('aria-current')).toBeNull();
    expect(buttons[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('emits the clicked annotation', () => {
    const second = item('b', 'Leak', 'NOTE', 'Water stain');
    fixture.componentRef.setInput('items', [item('a', 'One', 'MARKER', null), second]);
    const picked: AnnotationSummary[] = [];
    fixture.componentInstance.selected.subscribe((value) => picked.push(value));
    fixture.detectChanges();

    el().querySelectorAll<HTMLButtonElement>('li button')[1]?.click();

    expect(picked).toEqual([second]);
  });

  it('tells the user to zoom in when the page was cut off', () => {
    fixture.componentRef.setInput('truncated', true);
    fixture.detectChanges();

    expect(el().querySelector('[role="status"]')?.textContent).toContain('Zoom in');
  });
  describe('explaining itself', () => {
    const many = [
      item('a', 'Cracked window', 'MARKER', null),
      item('b', 'Leak', 'NOTE', 'Water stain'),
      item('c', 'Inspection area', 'OUTLINE', null),
      item('d', 'Bar Pep (node/1001)', 'MARKER', null),
    ];
    const text = () => el().textContent?.replace(/\s+/g, ' ') ?? '';

    it('says what the list is and how to change it', () => {
      fixture.detectChanges();

      expect(el().querySelector('h3')?.textContent).toBe('In this view');
      expect(text()).toContain('Everything added inside the part of the map you are looking at');
      expect(text()).toContain('Pan or zoom the map to change it');
    });

    it('shows placeholders while the first load runs, and not the empty message', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(el().querySelectorAll('[hlmSkeleton]').length).toBeGreaterThan(0);
      expect(el().querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
        'Loading annotations',
      );
      expect(text()).not.toContain('Nothing here yet');
    });

    it('keeps showing the list while a new view loads', () => {
      fixture.componentRef.setInput('items', many);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(el().querySelectorAll('li button')).toHaveLength(4);
      expect(el().querySelectorAll('[hlmSkeleton]')).toHaveLength(0);
    });

    it('counts what is in view', () => {
      fixture.componentRef.setInput('items', many);
      fixture.detectChanges();

      expect(text()).toContain('4 in view');
    });

    it('filters by kind and counts what is shown out of what is in view', async () => {
      fixture.componentRef.setInput('items', many);
      fixture.detectChanges();
      const filter = (label: string) =>
        [...el().querySelectorAll<HTMLButtonElement>('[hlmToggleGroup] button')].find(
          (b) => b.getAttribute('aria-label') === label,
        );

      filter('Markers')?.click();
      fixture.detectChanges();

      expect(text()).toContain('2 of 4 in view');
      expect([...el().querySelectorAll('[hlmItemTitle]')].map((t) => t.textContent)).toEqual([
        'Cracked window',
        'Bar Pep (node/1001)',
      ]);

      filter('All kinds')?.click();
      fixture.detectChanges();
      expect(text()).toContain('4 in view');
    });

    it('says so when the chosen kind has nothing in view', () => {
      fixture.componentRef.setInput('items', [item('a', 'Cracked window', 'MARKER', null)]);
      fixture.detectChanges();

      [...el().querySelectorAll<HTMLButtonElement>('[hlmToggleGroup] button')]
        .find((b) => b.getAttribute('aria-label') === 'Outlines')
        ?.click();
      fixture.detectChanges();

      expect(text()).toContain('Nothing of that kind in this view');
      expect(el().querySelector('ul')).toBeNull();
    });

    it('gives each kind an icon in the colour the map draws it with', () => {
      fixture.componentRef.setInput('items', many);
      fixture.detectChanges();

      const colours = [...el().querySelectorAll<HTMLElement>('li ng-icon')].map(
        (icon) => icon.style.color,
      );

      const asRgb = (hex: string) => {
        const probe = document.createElement('span');
        probe.style.color = hex;
        return probe.style.color;
      };
      expect(colours).toEqual([
        asRgb(PALETTE.MARKER),
        asRgb(PALETTE.NOTE),
        asRgb(PALETTE.OUTLINE),
        asRgb(PALETTE.MARKER),
      ]);
    });

    it('counts each kind on its filter', () => {
      fixture.componentRef.setInput('items', many);
      fixture.detectChanges();

      const counts = [...el().querySelectorAll<HTMLButtonElement>('[hlmToggleGroup] button')].map(
        (b) => `${b.getAttribute('aria-label')}: ${b.textContent?.trim()}`,
      );

      expect(counts).toEqual(['All kinds: 4', 'Markers: 2', 'Notes: 1', 'Outlines: 1']);
    });

    it('badges the places that come from an import, and explains the badge once', () => {
      fixture.componentRef.setInput('items', [item('a', 'Cracked window', 'MARKER', null)]);
      fixture.detectChanges();
      expect(el().querySelector('[hlmBadge]')).toBeNull();
      expect(text()).not.toContain('imported from OpenStreetMap');

      fixture.componentRef.setInput('items', many);
      fixture.detectChanges();
      const badged = [...el().querySelectorAll('li')]
        .filter((row) => row.querySelector('[hlmBadge]'))
        .map((row) => row.querySelector('[hlmItemTitle]')?.textContent);
      expect(badged).toEqual(['Bar Pep (node/1001)']);
      expect(text()).toContain('OSM marks places imported from OpenStreetMap');
    });
  });
});
