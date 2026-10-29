import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MapStatus } from './map-status';

describe('MapStatus', () => {
  let fixture: ComponentFixture<MapStatus>;
  const el = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(MapStatus);
  });

  it('shows nothing until the source of the map is known', () => {
    fixture.detectChanges();

    expect(el().querySelector('.bar')).toBeNull();
  });

  it('says where the picture comes from and where the camera is', () => {
    fixture.componentRef.setInput('mode', 'photorealistic');
    fixture.componentRef.setInput('position', {
      latitude: 41.40361,
      longitude: 2.17435,
      height: 320,
    });
    fixture.detectChanges();

    expect(el().textContent).toContain('Google Photorealistic 3D Tiles');
    expect(el().textContent).toContain('41.4036, 2.1744 · 320 m');
  });

  it('names the open street map fallback', () => {
    fixture.componentRef.setInput('mode', 'osm');
    fixture.detectChanges();

    expect(el().textContent).toContain('OpenStreetMap');
  });

  it('asks to go back to the starting view', () => {
    fixture.componentRef.setInput('mode', 'osm');
    let resets = 0;
    fixture.componentInstance.resetRequested.subscribe(() => resets++);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('button')?.click();

    expect(resets).toBe(1);
  });
});
