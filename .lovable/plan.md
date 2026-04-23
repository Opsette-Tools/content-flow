
# Content Planner — Lightweight Local-First Calendar

A clean, mobile-first content planning app built with Ant Design, persisted locally via IndexedDB, deployable to GitHub Pages, and PWA-ready (without breaking Lovable preview).

## What you'll get

A solo-creator content planner with **Projects**, **Content Items**, a **checklist guardrail system**, and three working views (Dashboard, List, Calendar) plus a detail editor — all running entirely in the browser.

## Core entities

**Projects** — name, description, color tag, timestamps.

**Content Items** — title, project, slug/route, type (Article/Guide/Landing Page/Update/Resource/FAQ/Other), primary keyword, secondary keywords, publish date, status (Idea/Planned/Drafting/Ready/Published/Archived), brief notes, checklist, timestamps.

**Checklist (fixed for V1)** — Title finalized · Route/slug set · Primary keyword chosen · Secondary keywords added · Outline/brief ready · Internal links planned · Metadata considered · Ready to draft · Ready to publish.

## Views

### 1. Dashboard
- Quick stats row: Total · Planned · Drafting · Ready · Published (Ant `Card` + `Statistic`, stacks on mobile)
- **Upcoming this week** list
- **Overdue** list (planned items with past publish dates) with red badges
- **Unscheduled ideas** section
- **Recent items** list
- Floating "Quick add" button (opens content modal)

### 2. Content List
- Ant `Table` on desktop → switches to `List` of cards on mobile
- Columns: Title, Project (color tag), Type, Primary Keyword, Publish Date, Status (colored tag)
- Filters in a collapsible bar: Project · Status · Type · Date range
- Search across title, keyword, slug
- Row actions: Edit · Duplicate · Delete · Quick status change (Dropdown)
- Sort by publish date

### 3. Calendar
- Ant `Calendar` month view
- Cells show badges per content item (color = status)
- Tap a date → Drawer listing items for that day + "Add for this date" button
- Tap an item → opens editor drawer
- Mobile: simplified cell rendering (count badge instead of titles)

### 4. Content Detail / Editor
- Opens as a `Drawer` (right side desktop, bottom sheet mobile)
- Ant `Form` with all fields, `Select` for project/type/status, `DatePicker` for publish date, `Select mode="tags"` for secondary keywords, `Input.TextArea` for brief
- Checklist as `Checkbox.Group` with progress indicator
- Auto-save on field blur/change (debounced)
- Actions: Save · Duplicate · Delete

### 5. Projects management
- Simple page to create/edit/delete projects, pick a color tag

## Layout & navigation

- Ant `Layout` with collapsible `Sider` (drawer on mobile via hamburger)
- `Menu` items: Dashboard · Content · Calendar · Projects · Settings
- Header: app title, dark mode toggle, project filter (global)
- Mobile-first: sider becomes a `Drawer`, toolbars wrap, tables collapse to cards

## Theming

- Ant Design `ConfigProvider` with a centralized `theme` token file
- Light + dark mode via `theme.darkAlgorithm`, toggle persisted in IndexedDB
- Minimal `index.css` — only resets, scrollbar polish, and a few layout helpers
- No Tailwind utility usage in app components

## Data layer

- `src/db/` module wrapping IndexedDB (via `idb` library) with typed repositories: `projectsRepo`, `contentRepo`, `settingsRepo`
- Clean async API: `list`, `get`, `create`, `update`, `delete`, `duplicate`
- Seed sample projects + a couple of content items on first run for a useful empty state
- Settings store for theme preference and global project filter

## Settings page

- Theme toggle
- Export all data → JSON download
- Import from JSON (with confirm)
- Export content list → CSV
- Reset all data (confirm modal)

## PWA setup (preview-safe)

- `vite-plugin-pwa` with `devOptions.enabled: false`
- Manifest with name, icons, `display: standalone`, theme color
- Registration guard in `main.tsx`: skip and unregister any existing SW when running inside an iframe or on Lovable preview hosts (`id-preview--*`, `lovableproject.com`)
- `navigateFallbackDenylist` for `/~oauth` and similar
- Note: install/offline only works in the published GitHub Pages build, not in the Lovable editor

## GitHub Pages deployment

- `.github/workflows/deploy.yml` — builds on push to `main`, deploys `dist/` via official `actions/deploy-pages`
- `vite.config.ts` reads `VITE_BASE` env (default `/`) so GitHub Pages subpath works without breaking local dev / Lovable preview
- React Router uses `basename` from the same env value
- Includes `public/404.html` SPA fallback for GitHub Pages deep links

## Project structure

```
src/
  db/                  IndexedDB layer + repos + types
  theme/               Ant token config + dark mode hook
  layout/              AppLayout, Sider, Header
  pages/
    Dashboard.tsx
    ContentList.tsx
    CalendarView.tsx
    Projects.tsx
    Settings.tsx
  components/
    ContentEditorDrawer.tsx
    ContentChecklist.tsx
    StatusTag.tsx
    ProjectTag.tsx
    QuickAddButton.tsx
    Filters.tsx
  hooks/               useContent, useProjects, useSettings
  utils/               date, csv, json import/export
```

## Explicitly excluded
Auth, collaboration, comments, AI, SEO/GSC/CMS integrations, notifications, social scheduling, Kanban as primary UI, backend of any kind.

## Out of scope for V1 (can add later)
- Editable global checklist labels
- Drag-and-drop on calendar
- Per-item attachments

Ready to build when you approve.
