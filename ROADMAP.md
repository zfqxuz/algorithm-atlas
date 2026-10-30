# Roadmap

## Now

- One `index.html` with a single workbench for 146 unique experiments.
- 122 field-guide topics + 24 original labs; duplicate BFS/DFS/union-find entries merged.
- 13 native SVG/DOM stage types: array, graph, tree, matrix, chart, timeline, frames, table, stack, vector, layers, pipeline, topology.
- Every lab has parameters, a seeded generator, playback/step/back/reset, metrics, pseudocode, an invariant, a step log, and a deep link.
- 101 Node engine tests + 5 Vitest lab-contract tests.
- GitHub Actions CI and GitHub Pages deployment.

## Next

- Deepen the domain adapters where the field-guide topic needs more than the shared stage: cache mapping, consensus, RSA/DH, image rasterization.
- Add browser smoke tests to CI with Playwright.
- Add a command palette and URL-shareable parameter snapshots.
- Add deterministic quiz/checkpoint mode inside the same workbench.
- Improve keyboard focus and screen-reader narration for the graph/tree stages.
- Add print/export of the current lab (parameters + final state) as a one-page PDF.

## Later — only if the product needs it

- Accounts and cross-device progress.
- Saved notes, collections, and classroom groups.
- AI-assisted explanations grounded in the same state trace.
- A thin API service with Postgres/SQLite and OAuth.
- Content administration for teachers.

The core learning experience is deliberately client-only. A backend is justified by user data and collaboration, not by visualizations themselves.
