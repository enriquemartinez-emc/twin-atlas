import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NewSceneForm } from './new-scene-form';

describe('NewSceneForm', () => {
  let fixture: ComponentFixture<NewSceneForm>;
  let created: string[];
  const el = (): HTMLElement => fixture.nativeElement;

  const flush = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  const submit = async () => {
    el().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await flush();
  };

  const typeName = async (text: string) => {
    const input = el().querySelector<HTMLInputElement>('#scene-name');
    if (!input) throw new Error('no name field');
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await flush();
    return input;
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(NewSceneForm);
    fixture.componentRef.setInput('canCreate', true);
    created = [];
    fixture.componentInstance.create.subscribe((name) => created.push(name));
    await flush();
  });

  it('emits the trimmed name and clears the field', async () => {
    const input = await typeName('  Old town  ');

    await submit();

    expect(created).toEqual(['Old town']);
    expect(input.value).toBe('');
    expect(el().textContent).not.toContain('Name the scene.');
  });

  it('asks for a name and does not emit without one', async () => {
    await submit();

    expect(created).toEqual([]);
    expect(el().textContent).toContain('Name the scene.');
  });

  it('treats a name of only spaces as missing', async () => {
    await typeName('     ');

    await submit();

    expect(created).toEqual([]);
    expect(el().textContent).toContain('Name the scene.');
  });

  it('cannot create until the map has a view, and shows problems', async () => {
    fixture.componentRef.setInput('canCreate', false);
    fixture.componentRef.setInput('problem', 'The view crosses the date line.');
    await flush();

    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(el().textContent).toContain('date line');
  });
});
