# Roadmap

## Now

- Static-first Vite + TypeScript build with legacy classic pages progressively migrated.
- 27 interactive algorithm labs, 122 visual field-guide notes, 6 graduate-topic articles.
- Optimization, Transformer, and page-replacement labs.
- Node tests + Vitest data tests + CDP browser checks.
- GitHub Actions CI and GitHub Pages build.

## Next

- Move the remaining classic labs onto shared TypeScript modules.
- Add browser smoke tests to CI with Playwright.
- Add a dedicated network-topology lab (topology editing + link-state animation).
- Add search indexing / command palette across labs and visual notes.
- Add small, deterministic quiz mode for the visual notes.
- Improve print/export of a topic article or visual card as a one-page PDF.

## Later — only if the product needs it

- Accounts and cross-device progress.
- Saved notes, collections, and classroom groups.
- AI-assisted explanations grounded in the same visual data.
- A thin API service with Postgres/SQLite and OAuth.
- Content administration for teachers.

The core learning experience is deliberately client-only. A backend is justified by user data and collaboration, not by visualizations themselves.
