import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { SceneResponse } from '@api/index';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SceneSelect } from './scene-select';

const scene = (id: string, name: string, createdAt: string): SceneResponse => ({
  id,
  name,
  createdAt,
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

describe('SceneSelect', () => {
  let fixture: ComponentFixture<SceneSelect>;
  const el = (): HTMLElement => fixture.nativeElement;
  const trigger = () => el().querySelector<HTMLButtonElement>('#scene-select');
  const items = () => [...document.querySelectorAll<HTMLElement>('hlm-select-item')];

  const flush = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(SceneSelect);
    fixture.componentRef.setInput('scenes', [
      scene('a', 'Plaza', '2026-03-05T10:00:00Z'),
      scene('b', 'Harbour', '2026-04-20T10:00:00Z'),
    ]);
    fixture.componentRef.setInput('selectedId', 'a');
    await flush();
  });

  afterEach(() => fixture.destroy());

  it('shows the scene that is open', () => {
    expect(trigger()?.textContent?.trim()).toBe('Plaza');
  });

  it('lists every scene with the day it was made', async () => {
    trigger()?.click();
    await flush();

    expect(items().map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Plaza Created Mar 5, 2026',
      'Harbour Created Apr 20, 2026',
    ]);
  });

  it('reports the id of the scene that is picked', async () => {
    const chosen: string[] = [];
    fixture.componentInstance.choose.subscribe((id) => chosen.push(id));
    trigger()?.click();
    await flush();

    items()[1]?.click();
    await flush();

    expect(chosen).toEqual(['b']);
  });

  it('follows the open scene when it changes from outside', async () => {
    fixture.componentRef.setInput('selectedId', 'b');
    await flush();

    expect(trigger()?.textContent?.trim()).toBe('Harbour');
  });
});
