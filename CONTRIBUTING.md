# Contributing

Thanks for taking a look at Algorithm Atlas.

## Local setup

```bash
pnpm install
pnpm dev
```

The production build is multi-page Vite output:

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run preview
```

## Adding a visual note

1. Add an `Entry` to `src/visuals/data/` using one of the typed visual specs.
2. Pick an existing renderer (`bars`, `matrix`, `chart`, `graph`, `tree`, `pipeline`, `layers`, `timeline`, `memory`, `table`, `stack`, `vector`, `topology`) or extend `src/visuals/render.ts`.
3. Keep `id` unique, use a level `L1`–`L4`, and make `mechanism` / `observe` explain what the learner should look at.
4. Run `pnpm test` and `pnpm run build`.

## Adding an interactive lab

- Put pure logic in `src/labs/` (or a core module) and DOM wiring in a page entry.
- Keep the page accessible: labels, visible focus, keyboard controls, reduced-motion-safe animation.
- Add a screenshot and link it from `visuals.html` and `README.md`.

## Pull requests

- Keep changes focused.
- Include a test or a browser-check note for behaviour changes.
- Do not commit `node_modules/` or `dist/`.
