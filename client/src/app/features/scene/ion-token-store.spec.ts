import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IonTokenStore } from './ion-token-store';

describe('IonTokenStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts empty and persists a trimmed token', () => {
    const store = TestBed.inject(IonTokenStore);
    expect(store.token()).toBeNull();

    store.save('  abc  ');

    expect(store.token()).toBe('abc');
    expect(localStorage.getItem('twinatlas.cesiumIonToken')).toBe('abc');
  });

  it('reads a previously stored token', () => {
    localStorage.setItem('twinatlas.cesiumIonToken', 'stored');

    expect(TestBed.inject(IonTokenStore).token()).toBe('stored');
  });

  it('treats a blank token as clearing it', () => {
    const store = TestBed.inject(IonTokenStore);
    store.save('abc');

    store.save('   ');

    expect(store.token()).toBeNull();
    expect(localStorage.getItem('twinatlas.cesiumIonToken')).toBeNull();
  });

  it('keeps working in memory when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = TestBed.inject(IonTokenStore);
    expect(store.token()).toBeNull();

    store.save('abc');

    expect(store.token()).toBe('abc');
  });
});
