import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { AnnotationResponse } from '@api/index';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnnotationEditor } from './annotation-editor';
import type { AnnotationFormValue } from '../annotation-draft';

const base: AnnotationResponse = {
  id: 'a1',
  sceneId: 's1',
  kind: 'MARKER',
  title: 'Cracked window',
  body: null,
  status: 'DRAFT',
  createdAt: '2026-01-01T00:00:00Z',
  geometry: { type: 'Point', coordinates: [2.175, 41.405] },
};
const note: AnnotationResponse = { ...base, kind: 'NOTE', title: 'Leak', body: 'wet' };
const outline: AnnotationResponse = {
  ...base,
  kind: 'OUTLINE',
  title: 'Area',
  geometry: {
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
};

describe('AnnotationEditor', () => {
  let fixture: ComponentFixture<AnnotationEditor>;
  let submitted: AnnotationFormValue[];
  const count = { move: 0, keep: 0, reload: 0, closed: 0 };

  const el = (): HTMLElement => fixture.nativeElement;
  const title = () => el().querySelector<HTMLInputElement>('#edit-title');
  const body = () => el().querySelector<HTMLTextAreaElement>('#edit-body');
  const save = () => el().querySelector<HTMLButtonElement>('button[type="submit"]');
  const button = (label: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent?.trim() === label);

  const flush = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  const type = async (field: HTMLInputElement | HTMLTextAreaElement | null, text: string) => {
    if (!field) throw new Error('field not found');
    field.value = text;
    field.dispatchEvent(new Event('input'));
    await flush();
  };

  const open = async (annotation: AnnotationResponse) => {
    fixture.componentRef.setInput('annotation', annotation);
    await flush();
  };

  beforeEach(() => {
    submitted = [];
    count.move = count.keep = count.reload = count.closed = 0;
    fixture = TestBed.createComponent(AnnotationEditor);
    const editor = fixture.componentInstance;
    editor.submitted.subscribe((value) => submitted.push(value));
    editor.moveRequested.subscribe(() => count.move++);
    editor.moveCancelled.subscribe(() => count.keep++);
    editor.reloadRequested.subscribe(() => count.reload++);
    editor.closed.subscribe(() => count.closed++);
  });

  it('starts from the stored values and has nothing to save yet', async () => {
    await open(base);

    expect(el().textContent).toContain('Edit marker');
    expect(title()?.value).toBe('Cracked window');
    expect(body()).toBeNull();
    expect(save()?.disabled).toBe(true);
  });

  it('emits the new title once something changed', async () => {
    await open(base);
    await type(title(), 'Loose tile');
    expect(save()?.disabled).toBe(false);

    save()?.click();
    await flush();

    expect(submitted).toEqual([{ title: 'Loose tile', body: '' }]);
  });

  it('will not save a blank or over-long title and explains why', async () => {
    await open(base);

    await type(title(), '   ');
    save()?.click();
    await flush();
    expect(submitted).toEqual([]);
    expect(el().textContent).toContain('Give it a title.');

    await type(title(), 'x'.repeat(121));
    save()?.click();
    await flush();
    expect(submitted).toEqual([]);
    expect(el().textContent).toContain('under 120 characters');
  });

  it('treats note text of only spaces as missing', async () => {
    await open(note);
    await type(body(), '    ');
    save()?.click();
    await flush();

    expect(submitted).toEqual([]);
    expect(el().textContent).toContain('A note needs some text.');
  });

  it('shows the text of a note and requires it', async () => {
    await open(note);
    expect(body()?.value).toBe('wet');

    await type(body(), '');
    save()?.click();
    await flush();
    expect(submitted).toEqual([]);
    expect(el().textContent).toContain('A note needs some text.');

    await type(body(), 'dry now');
    save()?.click();
    await flush();
    expect(submitted).toEqual([{ title: 'Leak', body: 'dry now' }]);
  });

  it('starts over with the new values when a newer version arrives', async () => {
    await open(base);
    await type(title(), 'My unsaved edit');

    await open({ ...base, title: 'Renamed elsewhere' });

    expect(title()?.value).toBe('Renamed elsewhere');
    expect(save()?.disabled).toBe(true);
  });

  it('lets a pin be moved and saves a move on its own', async () => {
    await open(base);
    button('Move on map')?.click();
    expect(count.move).toBe(1);

    fixture.componentRef.setInput('moving', true);
    await flush();
    expect(button('Choose again')).toBeDefined();

    fixture.componentRef.setInput('moving', false);
    fixture.componentRef.setInput('moved', true);
    await flush();
    expect(el().textContent).toContain('A new position is chosen');
    expect(button('Choose again')).toBeDefined();
    expect(save()?.disabled).toBe(false);

    button('Keep position')?.click();
    expect(count.keep).toBe(1);
  });

  it('does not offer to move an outline', async () => {
    await open(outline);

    expect(button('Move on map')).toBeUndefined();
  });

  it('shows a problem and, for a conflict, offers the latest version', async () => {
    await open(base);
    fixture.componentRef.setInput(
      'problem',
      'Someone changed this annotation since you opened it.',
    );
    await flush();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Someone changed');
    expect(button('Load latest version')).toBeUndefined();

    fixture.componentRef.setInput('stale', true);
    await flush();
    button('Load latest version')?.click();

    expect(count.reload).toBe(1);
  });

  it('disables saving while busy and can be closed', async () => {
    await open(base);
    await type(title(), 'Other');
    fixture.componentRef.setInput('busy', true);
    await flush();

    expect(save()?.disabled).toBe(true);
    expect(save()?.textContent).toContain('Saving');

    button('Close')?.click();
    expect(count.closed).toBe(1);
  });
});
