import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls once with the latest arguments after the quiet period', () => {
    const fn = vi.fn<(value: number) => void>();
    const debounced = debounce(fn, 100);

    debounced(1);
    vi.advanceTimersByTime(60);
    debounced(2);
    vi.advanceTimersByTime(60);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('fires again after a later call', () => {
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 50);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel drops the pending call', () => {
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 50);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(500);

    expect(fn).not.toHaveBeenCalled();
  });
});
