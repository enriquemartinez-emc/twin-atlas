// Fails when a template carries a long run of utility classes. Styling belongs in Spartan (Helm)
// components or in the component's own `styles` block. See AGENTS.md, "Spartan UI usage".
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const MAX_CLASSES = 4;
const root = new URL('../src/app', import.meta.url).pathname;
const SKIP = ['/shared/ui/', '/api/'];

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) yield path;
  }
}

const problems = [];
for (const file of sources(root)) {
  if (SKIP.some((part) => file.includes(part))) continue;
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\sclass="([^"]*)"/g)) {
    const classes = match[1].split(/\s+/).filter(Boolean);
    if (classes.length > MAX_CLASSES) {
      const line = text.slice(0, match.index).split('\n').length;
      problems.push(
        `${relative(root, file)}:${line} has ${classes.length} classes (max ${MAX_CLASSES}): "${match[1]}"`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`Class bloat:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`No template has more than ${MAX_CLASSES} classes in one class attribute.`);
