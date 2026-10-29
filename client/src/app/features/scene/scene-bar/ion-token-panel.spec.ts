import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { IonTokenPanel } from './ion-token-panel';

describe('IonTokenPanel', () => {
  let fixture: ComponentFixture<IonTokenPanel>;
  const el = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(IonTokenPanel);
  });

  it('shows nothing until the map mode is known', () => {
    fixture.detectChanges();

    expect(el().querySelector('form')).toBeNull();
    expect(el().querySelector('button')).toBeNull();
  });

  it('offers the token form on the OSM globe and emits the pasted token', () => {
    fixture.componentRef.setInput('mode', 'osm');
    const saved: string[] = [];
    fixture.componentInstance.saved.subscribe((token) => saved.push(token));
    fixture.detectChanges();
    const input = el().querySelector<HTMLInputElement>('#ion-token');
    const button = el().querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);

    if (input) {
      input.value = 'secret-token';
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    expect(button?.disabled).toBe(false);
    button?.click();
    fixture.detectChanges();

    expect(saved).toEqual(['secret-token']);
    expect(input?.value).toBe('');
  });

  it('says so when the saved token was rejected', () => {
    fixture.componentRef.setInput('mode', 'osm');
    fixture.componentRef.setInput('tilesError', 'Unauthorized');
    fixture.detectChanges();

    expect(el().querySelector('[role="status"]')?.textContent).toContain('could not be loaded');
  });

  it('offers to forget the token in photorealistic mode', () => {
    fixture.componentRef.setInput('mode', 'photorealistic');
    let forgotten = 0;
    fixture.componentInstance.forgotten.subscribe(() => forgotten++);
    fixture.detectChanges();

    el().querySelector('button')?.click();

    expect(el().querySelector('form')).toBeNull();
    expect(forgotten).toBe(1);
  });
});
