import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SceneResponse } from '@api/index';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SceneBar } from './scene-bar';

const scene = (id: string, name: string): SceneResponse => ({
  id,
  name,
  createdAt: '2026-01-01T00:00:00Z',
  extent: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
});

describe('SceneBar', () => {
  let fixture: ComponentFixture<SceneBar>;
  const el = (): HTMLElement => fixture.nativeElement;
  const overlay = (): HTMLElement | null => document.querySelector('.cdk-overlay-container');

  const flush = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  const button = (label: string): HTMLButtonElement | undefined =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

  beforeEach(() => {
    fixture = TestBed.createComponent(SceneBar);
    fixture.componentRef.setInput('scenes', []);
  });

  afterEach(() => fixture.destroy());

  it('names the app and shows its icon', async () => {
    await flush();

    expect(el().querySelector('h1')?.textContent).toContain('Twin Atlas');
    expect(el().querySelector('img')?.getAttribute('src')).toContain('favicon.svg');
  });

  it('says there are no scenes, and makes creating one the main action', async () => {
    await flush();

    expect(el().querySelector('select')).toBeNull();
    expect(el().textContent).toContain('No scenes yet');
    expect(button('New scene')?.classList.contains('bg-primary')).toBe(true);
  });

  it('shows the open scene and passes on the one that is chosen', async () => {
    fixture.componentRef.setInput('scenes', [scene('a', 'Plaza'), scene('b', 'Harbour')]);
    fixture.componentRef.setInput('selectedId', 'a');
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((id) => chosen.push(id));
    await flush();
    expect(el().querySelector('#scene-select')?.textContent).toContain('Plaza');

    el().querySelector<HTMLButtonElement>('#scene-select')?.click();
    await flush();
    const harbour = [...document.querySelectorAll('hlm-select-item')].find((i) =>
      i.textContent?.includes('Harbour'),
    );
    if (harbour instanceof HTMLElement) harbour.click();
    await flush();

    expect(chosen).toEqual(['b']);
  });

  it('opens the new scene form in a dialog, and closes it once another scene is open', async () => {
    fixture.componentRef.setInput('scenes', [scene('a', 'Plaza')]);
    fixture.componentRef.setInput('selectedId', 'a');
    fixture.componentRef.setInput('canCreate', true);
    await flush();
    expect(overlay()?.querySelector('#scene-name') ?? null).toBeNull();

    button('New scene')?.click();
    await flush();
    expect(overlay()?.querySelector('#scene-name')).not.toBeNull();

    fixture.componentRef.setInput('selectedId', 'b');
    await flush();
    await flush();
    expect(overlay()?.querySelector('#scene-name') ?? null).toBeNull();
  });

  it('passes the new scene name on', async () => {
    fixture.componentRef.setInput('canCreate', true);
    const created: string[] = [];
    fixture.componentInstance.create.subscribe((name) => created.push(name));
    await flush();
    button('New scene')?.click();
    await flush();

    const input = overlay()?.querySelector<HTMLInputElement>('#scene-name');
    if (!input) throw new Error('no name field');
    input.value = 'Old town';
    input.dispatchEvent(new Event('input'));
    await flush();
    overlay()?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flush();

    expect(created).toEqual(['Old town']);
  });

  it('asks to copy the link and says how it went', async () => {
    let copies = 0;
    fixture.componentInstance.copyLink.subscribe(() => copies++);
    await flush();

    button('Copy link')?.click();
    expect(copies).toBe(1);

    fixture.componentRef.setInput('linkLabel', 'Link copied');
    await flush();
    expect(button('Link copied')).toBeDefined();
  });

  it('keeps the 3D tiles token in the map settings', async () => {
    fixture.componentRef.setInput('mapMode', 'osm');
    await flush();
    expect(el().querySelector('#ion-token')).toBeNull();

    button('Map settings')?.click();
    await flush();

    expect(overlay()?.querySelector('#ion-token')).not.toBeNull();
  });
});
