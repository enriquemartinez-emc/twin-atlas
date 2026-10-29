import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { PALETTE } from '@map/palette';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRail, type Tool } from './tool-rail';

describe('ToolRail', () => {
  let fixture: ComponentFixture<ToolRail>;
  const buttons = () =>
    [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolRail);
    fixture.componentRef.setInput('tool', 'select');
    fixture.detectChanges();
  });

  it('offers select and one tool per kind, each with an accessible name', () => {
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'Select',
      'Marker',
      'Note',
      'Outline',
    ]);
    expect(fixture.nativeElement.querySelector('[role="toolbar"]')).not.toBeNull();
  });

  it('marks only the active tool as pressed', () => {
    fixture.componentRef.setInput('tool', 'NOTE');
    fixture.detectChanges();

    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
  });

  it('emits the tool that was clicked', () => {
    const chosen: Tool[] = [];
    fixture.componentInstance.chosen.subscribe((tool) => chosen.push(tool));

    buttons()[3]?.click();
    buttons()[0]?.click();

    expect(chosen).toEqual(['OUTLINE', 'select']);
  });

  it('draws each kind in the colour the map uses for it', () => {
    const colours = buttons().map((b) => b.style.getPropertyValue('--tool-colour'));

    expect(colours.slice(1)).toEqual([PALETTE.MARKER, PALETTE.NOTE, PALETTE.OUTLINE]);
  });
});
