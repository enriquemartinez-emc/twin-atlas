import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SceneResponse } from '@api/index';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenePicker } from './scene-picker';

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

describe('ScenePicker', () => {
  let fixture: ComponentFixture<ScenePicker>;
  const el = (): HTMLElement => fixture.nativeElement;

  const flush = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ScenePicker);
    fixture.componentRef.setInput('scenes', []);
  });

  it('explains what to do when there are no scenes', () => {
    fixture.detectChanges();

    expect(el().querySelector('select')).toBeNull();
    expect(el().textContent).toContain('No scenes yet');
  });

  it('lists the scenes and emits the chosen one', () => {
    fixture.componentRef.setInput('scenes', [scene('a', 'Plaza'), scene('b', 'Harbour')]);
    fixture.componentRef.setInput('selectedId', 'a');
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((id) => chosen.push(id));
    fixture.detectChanges();

    const select = el().querySelector('select');
    expect([...(select?.options ?? [])].map((o) => o.text)).toEqual(['Plaza', 'Harbour']);
    if (select) {
      select.value = 'b';
      select.dispatchEvent(new Event('change'));
    }
    expect(chosen).toEqual(['b']);
  });

  it('emits the trimmed name to create a scene and clears the field', async () => {
    fixture.componentRef.setInput('canCreate', true);
    const created: string[] = [];
    fixture.componentInstance.create.subscribe((name) => created.push(name));
    await flush();
    const input = el().querySelector<HTMLInputElement>('#scene-name');
    if (!input) throw new Error('no name field');
    input.value = '  Old town  ';
    input.dispatchEvent(new Event('input'));
    await flush();

    el().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flush();

    expect(created).toEqual(['Old town']);
    expect(input.value).toBe('');
    expect(el().textContent).not.toContain('Name the scene.'); // a fresh form shows no error
  });

  it('asks for a name and does not emit without one', async () => {
    fixture.componentRef.setInput('canCreate', true);
    const created: string[] = [];
    fixture.componentInstance.create.subscribe((name) => created.push(name));
    await flush();

    el().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flush();

    expect(created).toEqual([]);
    expect(el().textContent).toContain('Name the scene.');
  });

  it('cannot create until the map has a view, and shows problems', async () => {
    fixture.componentRef.setInput('problem', 'The view crosses the date line.');
    await flush();

    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(el().textContent).toContain('date line');
  });
});
