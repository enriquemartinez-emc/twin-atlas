# 015 — HTML documentation

**Status:** In progress | **Branch:** `docs/html-docs`

## Description

A `docs/` site of plain HTML that explains the project to someone who has not read the code: a front page with a clickable system map, an architecture page, a glossary, and one page per finished task. Light theme, sans-serif, solid soft colours with solid borders. From now on every task adds its own page.

## Acceptance criteria

- [x] `docs/index.html` opens from disk with no server, build step, script, web font or CDN. It shows a status board of every task and a system map whose boxes link to the task that built them.
- [x] `docs/architecture.html` and `docs/glossary.html` exist. The glossary explains every term a newcomer needs, including ETag, Cesium ion token, functional core and keyset pagination.
- [x] A page exists for each finished task (001 to 008) and for this one, each with: plain-words summary, how to try it, what was built, a diagram, why, how it was checked, known limits.
- [x] One stylesheet (`docs/assets/docs.css`): light theme, system sans-serif font stack, solid soft fills with solid borders, no gradients, shadows or animation. Colours mean the same thing in every diagram, and a legend says so.
- [x] Diagrams are inline SVG with titles, readable on a phone, and use the shared colour classes.
- [x] Layout works from phone width up, with visible keyboard focus and sufficient contrast.
- [x] Every internal link resolves (checked by a script).
- [x] AGENTS.md has the workflow rule, the style rules and the "Done means" line. `docs/tasks/_template.html` exists to start the next page.
- [x] Pages checked in a real browser (screenshots), not just written.
- [ ] Client, backend and other criteria: n/a.

## Notes

- 13 HTML pages: front page, architecture, glossary, nine task pages (001 to 008 and this one) and a template.
- Verified by script: 230 internal links and anchors resolve, tags balance, one `main` per page, no scripts or external resources, every diagram has its own title.
- Verified in headless Chromium at desktop and phone width. Fixed along the way: container titles hidden behind inner boxes in a diagram, phone diagrams too small (now they scroll sideways), the phone menu pushing content down (content now comes first).
- The pages were produced with a throwaway generator kept outside the repository. The committed result is plain HTML and CSS.

## Out of scope

- A documentation generator or any build tooling. Pages are written by hand (or with a throwaway script that is not committed).
