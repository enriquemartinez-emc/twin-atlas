import type { ProblemResponse } from '@api/index';

export type ProblemCode = NonNullable<ProblemResponse['code']>;

/**
 * One readable sentence per stable server code. The type makes this exhaustive: when a new code
 * appears in the regenerated SDK, this file stops compiling until it has a message.
 */
const MESSAGES: Readonly<Record<ProblemCode, string>> = {
  SCENE_NOT_FOUND: 'This scene no longer exists. Pick another one.',
  ANNOTATION_NOT_FOUND: 'This annotation no longer exists. It may have been removed.',
  NOT_FOUND: 'That could not be found.',
  INVALID_GEOMETRY: 'That shape is not valid. It may cross itself or lie outside the world.',
  GEOMETRY_OUTSIDE_SCENE_EXTENT: 'That spot is outside the scene. Place it inside the scene area.',
  GEOMETRY_KIND_MISMATCH:
    'That is the wrong kind of shape: pins take a point, outlines take an area.',
  TEXT_ONLY_FOR_NOTES: 'Only notes have text.',
  UNSUPPORTED_SOURCE_ELEMENT: 'Only nodes and ways with coordinates can be imported.',
  OPEN_WAY: 'That line is not a closed area, so it cannot become an outline.',
  UNTAGGED_ELEMENT: 'That map element has no tags, so there is nothing to import.',
  TITLE_ALREADY_USED: 'Another annotation in this scene already has that title.',
  VALIDATION_FAILED: 'Some fields are not valid. Check them and try again.',
  REQUEST_INVALID: 'The request was not understood. Try again.',
  INVALID_CURSOR: 'The list position expired. Reload the list.',
  CONCURRENT_MODIFICATION: 'Someone changed this just now. Reload it and try again.',
  STALE_VERSION:
    'Someone changed this annotation since you opened it. Load the latest version to continue.',
  PRECONDITION_REQUIRED: 'The app did not say which version it was editing. Reload and try again.',
  INTERNAL_ERROR: 'Something went wrong on the server. Try again in a moment.',
};

const NETWORK = 'Could not reach the server. Check your connection and try again.';

export function problemMessage(problem: ProblemResponse | undefined): string {
  if (!problem?.code) return NETWORK;
  return MESSAGES[problem.code];
}
