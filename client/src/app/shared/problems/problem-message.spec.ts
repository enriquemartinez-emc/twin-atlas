import type { ProblemResponse } from '@api/index';
import { describe, expect, it } from 'vitest';
import { failed, succeeded } from './outcome';
import { type ProblemCode, problemMessage } from './problem-message';

const ALL_CODES: readonly ProblemCode[] = [
  'ANNOTATION_NOT_FOUND',
  'CONCURRENT_MODIFICATION',
  'GEOMETRY_KIND_MISMATCH',
  'GEOMETRY_OUTSIDE_SCENE_EXTENT',
  'INTERNAL_ERROR',
  'INVALID_CURSOR',
  'INVALID_GEOMETRY',
  'NOT_FOUND',
  'PRECONDITION_REQUIRED',
  'REQUEST_INVALID',
  'SCENE_NOT_FOUND',
  'STALE_VERSION',
  'TEXT_ONLY_FOR_NOTES',
  'TITLE_ALREADY_USED',
  'VALIDATION_FAILED',
];

const problem = (code: ProblemCode): ProblemResponse => ({
  code,
  title: 't',
  detail: 'd',
  status: 400,
});

describe('problemMessage', () => {
  it.each(ALL_CODES)('has a readable sentence for %s', (code) => {
    const message = problemMessage(problem(code));

    expect(message.length).toBeGreaterThan(10);
    expect(message).not.toContain(code); // never shows the raw code to a user
  });

  it('gives each code its own message', () => {
    const messages = new Set(ALL_CODES.map((code) => problemMessage(problem(code))));

    expect(messages.size).toBe(ALL_CODES.length);
  });

  it('explains the rule the user broke for the domain rejections', () => {
    expect(problemMessage(problem('TITLE_ALREADY_USED'))).toContain('title');
    expect(problemMessage(problem('GEOMETRY_OUTSIDE_SCENE_EXTENT'))).toContain('outside the scene');
  });

  it('tells the user to load the latest version when someone else changed the annotation', () => {
    expect(problemMessage(problem('STALE_VERSION'))).toContain('latest version');
  });

  it('talks about the connection when there is no problem body', () => {
    expect(problemMessage(undefined)).toContain('reach the server');
    expect(problemMessage({ title: 't', detail: 'd', status: 502 } as ProblemResponse)).toContain(
      'reach the server',
    );
  });
});

describe('outcome', () => {
  it('wraps a value or a problem', () => {
    expect(succeeded(3)).toEqual({ ok: true, value: 3 });
    expect(failed(undefined)).toEqual({ ok: false, problem: undefined });
  });
});
