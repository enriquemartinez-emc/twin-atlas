import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AnnotationForm } from './annotation-form';
import type { AnnotationFormValue } from '../annotation-draft';

describe('AnnotationForm', () => {
  let fixture: ComponentFixture<AnnotationForm>;
  let emitted: AnnotationFormValue[];
  let cancelled: number;

  const el = (): HTMLElement => fixture.nativeElement;
  const title = () => el().querySelector<HTMLInputElement>('#annotation-title');
  const body = () => el().querySelector<HTMLTextAreaElement>('#annotation-body');
  const saveButton = () => el().querySelector<HTMLButtonElement>('button[type="submit"]');

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

  const submit = async () => {
    saveButton()?.click();
    await flush();
  };

  beforeEach(async () => {
    emitted = [];
    cancelled = 0;
    fixture = TestBed.createComponent(AnnotationForm);
    fixture.componentRef.setInput('kind', 'MARKER');
    fixture.componentRef.setInput('ready', true);
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    await flush();
  });

  it('asks only for a title for a marker, and tells the user to click the map until it is placed', async () => {
    fixture.componentRef.setInput('ready', false);
    await flush();

    expect(el().textContent).toContain('New marker');
    expect(el().textContent).toContain('Click the map to place the marker');
    expect(title()).not.toBeNull();
    expect(body()).toBeNull();
  });

  it('emits the title when it is valid', async () => {
    await type(title(), 'Cracked window');
    await submit();

    expect(emitted).toEqual([{ title: 'Cracked window', body: '' }]);
  });

  it('does not emit and explains when the title is missing', async () => {
    await submit();

    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('Give it a title.');
  });

  it('treats a title of only spaces as missing', async () => {
    await type(title(), '    ');
    await submit();

    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('Give it a title.');
  });

  it('treats note text of only spaces as missing', async () => {
    fixture.componentRef.setInput('kind', 'NOTE');
    await flush();
    await type(title(), 'Leak');
    await type(body(), '   ');
    await submit();

    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('A note needs some text.');
  });

  it('rejects a title longer than 120 characters', async () => {
    await type(title(), 'x'.repeat(121));
    await submit();

    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('under 120 characters');
  });

  it('asks for text on a note and will not submit without it', async () => {
    fixture.componentRef.setInput('kind', 'NOTE');
    await flush();
    await type(title(), 'Leak');

    expect(el().textContent).toContain('New note');
    expect(body()).not.toBeNull();

    await submit();
    expect(emitted).toEqual([]);
    expect(el().textContent).toContain('A note needs some text.');

    await type(body(), 'Water stain on the ceiling');
    await submit();
    expect(emitted).toEqual([{ title: 'Leak', body: 'Water stain on the ceiling' }]);
  });

  it('describes how to draw an outline', async () => {
    fixture.componentRef.setInput('kind', 'OUTLINE');
    fixture.componentRef.setInput('ready', false);
    await flush();

    expect(el().textContent).toContain('New outline');
    expect(el().textContent).toContain('at least three');
  });

  it('disables saving until the draft is ready and while saving', async () => {
    fixture.componentRef.setInput('ready', false);
    await flush();
    expect(saveButton()?.disabled).toBe(true);

    fixture.componentRef.setInput('ready', true);
    await flush();
    expect(saveButton()?.disabled).toBe(false);

    fixture.componentRef.setInput('busy', true);
    await flush();
    expect(saveButton()?.disabled).toBe(true);
    expect(saveButton()?.textContent).toContain('Saving');
  });

  it('shows the server problem as an alert', async () => {
    fixture.componentRef.setInput(
      'problem',
      'Another annotation in this scene already has that title.',
    );
    await flush();

    expect(el().querySelector('[role="alert"]')?.textContent).toContain('already has that title');
  });

  it('emits cancelled', async () => {
    el().querySelector<HTMLButtonElement>('button[type="button"]')?.click();
    await flush();

    expect(cancelled).toBe(1);
  });
  describe('hint', () => {
    const hint = () => el().querySelector('[hlmMuted]')?.textContent?.trim();

    it('asks for a click until the shape is placed', async () => {
      fixture.componentRef.setInput('ready', false);
      await flush();

      expect(hint()).toBe('Click the map to place the marker.');
    });

    it('says what to do next once the shape is placed, not to click again', async () => {
      fixture.componentRef.setInput('ready', true);
      await flush();

      expect(hint()).toBe('Placed. Add a title and save, or click again to move it.');
    });

    it('has its own words for a note and an outline', async () => {
      fixture.componentRef.setInput('kind', 'NOTE');
      fixture.componentRef.setInput('ready', true);
      await flush();
      expect(hint()).toContain('Placed. Add a title and the text');

      fixture.componentRef.setInput('kind', 'OUTLINE');
      fixture.componentRef.setInput('ready', false);
      await flush();
      expect(hint()).toBe('Click the map to add corners (at least three), then save.');

      fixture.componentRef.setInput('ready', true);
      await flush();
      expect(hint()).toBe('That is enough corners. Add more, or give it a title and save.');
    });
  });
});
