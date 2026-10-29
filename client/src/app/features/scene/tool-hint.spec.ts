import { describe, expect, it } from 'vitest';
import { toolHint } from './tool-hint';

describe('toolHint', () => {
  it.each([
    ['select', 0, false, null],
    ['MARKER', 0, false, 'Click the map to place the marker.'],
    ['MARKER', 1, false, 'Placed. Add a title and save, or click again to move it.'],
    ['NOTE', 0, false, 'Click the map to place the note.'],
    ['NOTE', 1, false, 'Placed. Add a title and the text, then save, or click again to move it.'],
    ['OUTLINE', 0, false, 'Click the map to add corners (0 of 3 so far).'],
    ['OUTLINE', 2, false, 'Click the map to add corners (2 of 3 so far).'],
    ['OUTLINE', 3, false, 'That is enough corners. Add more, or give it a title and save.'],
    ['select', 0, true, 'Click the map to choose the new position.'],
  ] as const)('%s with %i points (moving: %s) says %s', (tool, points, moving, expected) => {
    expect(toolHint({ tool, points, moving })).toBe(expected);
  });
});
