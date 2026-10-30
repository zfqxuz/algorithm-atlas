# Contributing

Thanks for taking a look at Algorithm Atlas.

## Local setup

```bash
pnpm install
pnpm dev
```

The production build is a static Vite output. Everything runs in the browser; there is no API server.

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run preview
```

## The one-page rule

- `index.html` is the only entry point.
- A lab is selected inside the same page and deep-linked as `#lab/<id>`.
- Do not add a second field-guide page, a modal-only demo, or a separate lab HTML page. Old lab URLs should redirect.
- The catalogue is an index, not a gallery of autoplaying thumbnails.

## Adding an experiment

1. Add the metadata to `src/app/legacy.ts` (original lab) or `src/visuals/data/` (field-guide entry).
2. Map it to one of the existing `LabKind` stage adapters in `src/app/catalog.ts`.
3. Add or extend a trace generator in `src/app/engines.ts`.
4. Add the stage renderer only if the existing 13 stage types cannot express the state; extend `src/app/stage.ts` and `src/app/model.ts` together.
5. Make the experiment satisfy the contract in `tests/labs.test.ts`:
   - at least one parameter;
   - pseudocode and an invariant;
   - at least five meaningful frames;
   - narration and at least one metric per frame;
   - a valid active code line;
   - a changed stage and a completion flag.
6. Run `pnpm test`, `pnpm run typecheck`, and `pnpm run build`.

## Pull requests

- Keep changes focused.
- Include a test or a browser-check note for behaviour changes.
- Do not commit `node_modules/` or `dist/`.
