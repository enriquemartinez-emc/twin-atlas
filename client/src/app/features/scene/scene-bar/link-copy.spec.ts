import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { linkCopy } from './link-copy';

describe('linkCopy', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    writeText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const create = () => TestBed.runInInjectionContext(() => linkCopy());

  it('offers to copy until it has', () => {
    expect(create().label()).toBe('Copy link');
  });

  it('copies the address of the page and says so, then goes back to offering it', async () => {
    writeText.mockResolvedValue();
    const link = create();

    await link.copy();

    expect(writeText).toHaveBeenCalledWith(document.location.href);
    expect(link.label()).toBe('Link copied');
    vi.advanceTimersByTime(2500);
    expect(link.label()).toBe('Copy link');
  });

  it('says plainly when the browser refused', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const link = create();

    await link.copy();

    expect(link.label()).toBe('Could not copy');
  });
});
