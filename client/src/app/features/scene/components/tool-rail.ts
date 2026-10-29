import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMousePointer2 } from '@ng-icons/lucide';
import { KIND_ICONS, KIND_META, type AnnotationKind } from '@features/annotation/public-api';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmTooltipImports } from '@shared/ui/tooltip';

export type Tool = 'select' | AnnotationKind;

interface ToolOption {
  readonly tool: Tool;
  readonly label: string;
  readonly tip: string;
  readonly icon: string;
  readonly colour: string;
}

const TIPS: Record<AnnotationKind, string> = {
  MARKER: 'Marker: drop a pin on a spot',
  NOTE: 'Note: drop a pin with text on it',
  OUTLINE: 'Outline: draw an area, at least three corners',
};

export const TOOLS: readonly ToolOption[] = [
  {
    tool: 'select',
    label: 'Select',
    tip: 'Select: pick a place on the map or in the list',
    icon: 'lucideMousePointer2',
    colour: 'var(--primary)',
  },
  ...(['MARKER', 'NOTE', 'OUTLINE'] as const).map((kind) => ({
    tool: kind,
    label: KIND_META[kind].label,
    tip: TIPS[kind],
    icon: KIND_META[kind].icon,
    colour: KIND_META[kind].colour,
  })),
];

/** The tools along the map's edge. The active one is drawn in the colour of what it creates. */
@Component({
  selector: 'app-tool-rail',
  imports: [NgIcon, HlmButtonImports, HlmTooltipImports],
  providers: [provideIcons({ ...KIND_ICONS, lucideMousePointer2 })],
  template: `
    <div role="toolbar" aria-label="Tools" aria-orientation="vertical">
      @for (option of tools; track option.tool) {
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          type="button"
          position="right"
          [hlmTooltip]="option.tip"
          [attr.aria-pressed]="option.tool === tool()"
          [style.--tool-colour]="option.colour"
          (click)="chosen.emit(option.tool)"
        >
          <ng-icon [name]="option.icon" />
          <span class="sr-only">{{ option.label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    [role='toolbar'] {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: color-mix(in oklab, var(--card) 68%, transparent);
      backdrop-filter: blur(14px) saturate(1.2);
    }

    button[aria-pressed='true'] {
      background: var(--tool-colour);
      color: white;
    }

    @media (max-width: 40rem) {
      [role='toolbar'] {
        flex-direction: row;
      }
    }
  `,
})
export class ToolRail {
  readonly tool = input.required<Tool>();
  readonly chosen = output<Tool>();

  protected readonly tools = TOOLS;
}
