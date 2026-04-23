# Content Flow

A local-first content planner and editorial calendar for solo operators. Part of the [Opsette Tools](https://tools.opsette.io) family.

## Features

- Dashboard with cadence tracking, publishing heatmap, funnel distribution, and gap detection
- Content list with medium/funnel/tags/status filters
- Calendar with drag-to-reschedule on desktop
- Projects with per-project cadence targets and scoped detail pages
- Idea Inbox for quick-capture and triage
- Command palette (`Cmd/Ctrl+K`) for navigation and quick actions
- Global keyboard shortcuts (`?` for help)
- JSON export / import / reset

## Stack

Vite + React + TypeScript + antd 5 + IndexedDB (via [`idb`](https://www.npmjs.com/package/idb)).

## Local dev

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

## Deployment

Deploys to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The Vite `base` is hardcoded to `/content-flow/` to match the project-page URL at `tools.opsette.io/content-flow/`.
