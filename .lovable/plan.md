
# Categorization Overhaul + Dashboard Cadence & Heatmap

Two-part upgrade: smarter content categorization (medium, funnel stage, tags) and a dashboard that shows publishing rhythm.

## Part 1 — Categorization

### New fields on Content Items

- **Medium** (replaces the format-ish part of "Type"): `Article`, `Video`, `Short / Reel`, `Podcast`, `Newsletter`, `Email`, `Social Post`, `Landing Page`, `Guide`, `Webinar`, `Other`
- **Funnel stage**: `Awareness` (TOFU), `Consideration` (MOFU), `Decision` (BOFU), `Retention`, `None`
- **Tags**: free-form multi-select, color-coded, reusable across items (e.g. "Q1 launch", "case study", "evergreen")

The existing **Type** field is renamed to **Medium** and its options expanded — old values (`Article`, `Guide`, `Landing Page`, `Update`, `Resource`, `FAQ`, `Other`) map cleanly into the new list. A small one-time data migration in the IndexedDB upgrade handler will:
- copy `contentType` → `medium`
- map `Update` → `Article`, `Resource` → `Guide`, `FAQ` → `Article`
- default `funnelStage` to `None` and `tags` to `[]`

### Where these surface

**Editor drawer** — three new fields: Medium select (with small icon per medium), Funnel stage select, Tags multi-select with create-on-type and color preview.

**Content List**
- New columns: Medium (with icon), Funnel, Tags (chip cluster, truncated)
- New filters: Medium, Funnel, Tag (multi-select)
- Mobile cards show medium icon + funnel chip
- Search also matches tag names

**Calendar** — Day drawer items show medium icon next to title; cell badges colored by status (unchanged).

**Dashboard** — New "Distribution" mini-card (see Part 2).

### Tag management

Tags live as their own lightweight store (`tags` object store: `{ id, name, color, createdAt }`). Created on the fly from the editor; no separate management page in this pass — just rename/delete from a tiny popover in the tag chip on the Content List filter (out of scope if it bloats; can defer).

## Part 2 — Dashboard cadence & heatmap

### Cadence goals (per project)

- New field on **Project**: `cadenceTarget` — `{ count: number, period: "week" | "month" }` (optional)
- Set from the Projects page (new field in the project create/edit modal)
- Dashboard shows a **Cadence card** per project with a target: progress bar of published-this-period vs. target, plus a "behind / on track / ahead" status

### Publishing heatmap

- New full-width Dashboard card: **"Publishing activity"**
- GitHub-style grid: last ~16 weeks × 7 days, each cell shaded by number of items with `publishDate` on that day (counts both Published and scheduled)
- Cells colored by intensity using Ant token (`colorPrimary` with 5 opacity steps)
- Hover/tap a cell → tooltip with date + count + titles
- Tap → opens Calendar view focused on that day (out of scope for this pass; tooltip only)

### Distribution mini-card

- Small card next to stats: **"What you're making"**
- Stacked horizontal bar showing share of items by Medium (top 5) — purely visual, no chart library, just flexed divs colored by token

### Gap detector strip

- Below stats row: a thin alert strip that appears only when applicable
  - "No content scheduled for the next 7 days" — if true
  - "Project X hasn't published in 30+ days" — per project with cadence target
- Dismissible per session (not persisted)

## Layout (Dashboard, top → bottom)

```text
[ Stats row: Total · Planned · Drafting · Ready · Published ]
[ Gap detector strip (conditional) ]
[ Cadence cards (1 per project with a target) | Distribution mini-card ]
[ Publishing activity heatmap (full width) ]
[ Upcoming this week | Overdue ]
[ Unscheduled ideas | Recently updated ]
```

Mobile: everything stacks; heatmap horizontally scrolls with sticky day labels.

## Technical notes

- **DB version bump**: `DB_VERSION` 1 → 2. Upgrade handler creates `tags` store, runs migration on existing content rows (add `medium`, `funnelStage`, `tags`), keeps `contentType` as deprecated mirror for one version for safety.
- **Types** (`src/db/types.ts`): add `Medium`, `MEDIUMS`, `MEDIUM_ICONS` (lucide-react icon name map), `FunnelStage`, `FUNNEL_STAGES`, `Tag` interface; extend `ContentItem` with `medium`, `funnelStage`, `tags: string[]` (tag ids); extend `Project` with optional `cadenceTarget`.
- **Repos**: add `tagsRepo` (list/create/update/remove with usage cleanup); extend `projectsRepo` create/update to accept `cadenceTarget`.
- **New components**:
  - `src/components/MediumIcon.tsx` — maps medium → lucide icon
  - `src/components/TagChips.tsx` — render + multi-select chips
  - `src/components/dashboard/CadenceCard.tsx`
  - `src/components/dashboard/PublishingHeatmap.tsx`
  - `src/components/dashboard/DistributionCard.tsx`
  - `src/components/dashboard/GapStrip.tsx`
- **CSV export**: extend `contentToCsv` to include medium, funnel, tag names.
- **JSON export/import**: include `tags` store; importer tolerates missing fields (defaults applied).
- **Settings**: no UI changes needed; migration runs automatically on first load after upgrade.

## Out of scope (saved for later sessions)
- Per-medium checklist templates
- Recurring items / series
- Cmd+K command palette
- Drag-to-reschedule on calendar
- Tag management page
