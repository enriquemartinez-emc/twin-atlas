import { type SchemaPath, validate } from '@angular/forms/signals';

/**
 * Signal Forms' `required` accepts a value made only of spaces. Add this next to it so a title of
 * spaces is stopped in the form, with the same message, instead of coming back as a server error.
 */
export function notBlank(path: SchemaPath<string>, message: string): void {
  validate(path, ({ value }) => (value().trim() === '' ? { kind: 'blank', message } : undefined));
}
