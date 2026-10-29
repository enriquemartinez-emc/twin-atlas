import {
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
  type ComponentFixture,
} from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MapLoading } from './map-loading';

describe('MapLoading', () => {
  let fixture: ComponentFixture<MapLoading>;
  const el = (): HTMLElement => fixture.nativeElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Manual });
    fixture = TestBed.createComponent(MapLoading);
  });

  it('says the viewer is starting until the source of the map is known', () => {
    fixture.detectChanges();

    expect(el().textContent).toContain('Starting the 3D viewer');
    expect(el().querySelector('hlm-spinner')).not.toBeNull();
  });

  it('says the map is loading once the viewer exists, and warns that Google tiles are slow', () => {
    fixture.componentRef.setInput('mode', 'photorealistic');
    fixture.detectChanges();

    expect(el().textContent).toContain('Loading the map');
    expect(el().textContent).toContain("Google's 3D tiles can take a few seconds");
  });

  it('does not talk about Google tiles on the OpenStreetMap globe', () => {
    fixture.componentRef.setInput('mode', 'osm');
    fixture.detectChanges();

    expect(el().textContent).toContain('Loading the map');
    expect(el().textContent).not.toContain('Google');
  });

  it('is a status message for screen readers', () => {
    fixture.detectChanges();

    expect(el().querySelector('[role="status"]')).not.toBeNull();
  });

  it('admits it is slow only after a while', async () => {
    fixture.detectChanges();
    expect(el().textContent).not.toContain('Still loading');

    const [block] = await fixture.getDeferBlocks();
    await block?.render(DeferBlockState.Complete);

    expect(el().textContent).toContain('Still loading. The map needs an internet connection.');
  });
});
