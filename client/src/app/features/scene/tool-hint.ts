import { OUTLINE_MIN_POINTS } from '@features/annotation';
import type { Tool } from './components/tool-rail';

export interface HintState {
  readonly tool: Tool;
  readonly points: number;
  readonly moving: boolean;
}

/** What to do next with the tool in hand, or null when nothing is being asked of the user. */
export function toolHint({ tool, points, moving }: HintState): string | null {
  if (moving) return 'Click the map to choose the new position.';
  switch (tool) {
    case 'select':
      return null;
    case 'MARKER':
      return points === 0
        ? 'Click the map to place the marker.'
        : 'Placed. Add a title and save, or click again to move it.';
    case 'NOTE':
      return points === 0
        ? 'Click the map to place the note.'
        : 'Placed. Add a title and the text, then save, or click again to move it.';
    case 'OUTLINE':
      return points < OUTLINE_MIN_POINTS
        ? `Click the map to add corners (${points} of ${OUTLINE_MIN_POINTS} so far).`
        : 'That is enough corners. Add more, or give it a title and save.';
  }
}
