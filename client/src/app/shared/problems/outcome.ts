import type { ProblemResponse } from '@api/index';

export type Outcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problem: ProblemResponse | undefined };

export const succeeded = <T>(value: T): Outcome<T> => ({ ok: true, value });

/** `problem` is undefined when no problem body arrived, for example when the network is down. */
export const failed = (problem: ProblemResponse | undefined): Outcome<never> => ({
  ok: false,
  problem,
});

/** The API's error bodies are problems with a `code`. Anything else (HTML from a proxy, text) is not. */
export function asProblem(error: unknown): ProblemResponse | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as ProblemResponse)
    : undefined;
}
