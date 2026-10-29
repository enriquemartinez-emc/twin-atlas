import { lucideHexagon, lucideMapPin, lucideMessageSquareText } from '@ng-icons/lucide';
import { PALETTE } from '@map/palette';
import type { AnnotationKind } from './annotation-draft';

export interface KindMeta {
  readonly label: string;
  readonly plural: string;
  readonly icon: string;
  readonly colour: string;
}

/** The one place a kind gets its name, icon and the colour the map draws it with. */
export const KIND_META: Record<AnnotationKind, KindMeta> = {
  MARKER: { label: 'Marker', plural: 'Markers', icon: 'lucideMapPin', colour: PALETTE.MARKER },
  NOTE: {
    label: 'Note',
    plural: 'Notes',
    icon: 'lucideMessageSquareText',
    colour: PALETTE.NOTE,
  },
  OUTLINE: { label: 'Outline', plural: 'Outlines', icon: 'lucideHexagon', colour: PALETTE.OUTLINE },
};

export const KIND_ICONS = { lucideMapPin, lucideMessageSquareText, lucideHexagon };
