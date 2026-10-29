# Third-party notices

Twin Atlas copies code and files from the projects below. Each is used under its licence, and the notices are kept here.

## Sim UI (MIT)

Two files are copied from Sim UI and adapted (<https://github.com/dofu-lab/simui>): `client/src/app/shared/components/badge-dot.ts` (from its `badge-08` example) and `client/src/app/features/scene/components/scene-select.ts` (from `select-40`, "Select with description"). Sim UI is a free, open-source, copy-paste collection of Angular components built on Spartan UI and Tailwind CSS.

```
MIT License

Copyright (c) 2025 Phuong Tran Dong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Spartan UI (MIT)

The Helm components in `client/src/app/shared/ui/` are copied into the project by Spartan's CLI (<https://github.com/spartan-ng/spartan>). The accessible behaviour comes from the `@spartan-ng/brain` package. Copyright (c) 2024 ROBIN GOETZ, under the MIT licence, whose text is the same as the one above apart from the copyright line.

## Figtree (SIL Open Font License 1.1)

The UI font, in `client/public/fonts/`. Copyright 2022 The Figtree Project Authors (<https://github.com/erikdkennedy/figtree>). The licence is in `client/public/fonts/FIGTREE-OFL-LICENSE.txt`.

## Geist Mono (SIL Open Font License 1.1)

The font of the documentation site, in `docs/assets/fonts/`. Copyright (c) 2023 Vercel, in collaboration with basement.studio. The licence is in `docs/assets/fonts/GEIST-OFL-LICENSE.txt`.

## OpenStreetMap data (ODbL)

The test extracts in `server/src/test/resources/osm/` and the map tiles shown by the app contain data © OpenStreetMap contributors, available under the [Open Database License](https://www.openstreetmap.org/copyright).

## ng-icons and Lucide (MIT, ISC)

`@ng-icons/core` (MIT) renders icons in Angular and `@ng-icons/lucide` (ISC) carries the Lucide icon set (<https://github.com/ng-icons/ng-icons>, <https://lucide.dev>). They are npm dependencies, not copied files. The icons in the tool rail, the status bar and the list come from Lucide.

## Agent skills in `.claude/skills/`

Five skill folders are copied from other projects, and `skills-lock.json` records where each came from: `angular-developer` and `angular-new-app` (<https://github.com/angular/angular>), `java-springboot` (<https://github.com/github/awesome-copilot>), `playwright-cli` (<https://github.com/microsoft/playwright-cli>) and `spartan` (<https://github.com/spartan-ng/spartan>). They keep the licences of their source repositories, which are the ones to read before reusing them. The two Angular skills say MIT in their own headers.

