# Content Flow roadmap

A prioritized plan aligned with the product thesis: **Content Flow is a planning surface for solo operators, not a team collaboration tool.** Its real home is embedded inside Opsette (iframe + Supabase via parent bridge), where it inherits account + device sync. Standalone is a demo, not a product.

Anything that smells like teamware (required fields, block-publish gating, pillar/cluster trees, multi-role workflows) is out. Anything that reduces friction for one person planning their own content is in.

Sizes: **S** = half-day, **M** = 1–2 days, **L** = multi-day (schema + multiple views).

---

## ✅ Shipped

- Medium / Format field (`Article`, `Video`, `Short / Reel`, `Podcast`, `Newsletter`, `Email`, `Social Post`, `Landing Page`, `Guide`, `Webinar`, `Other`)
- Funnel stage (`Awareness`, `Consideration`, `Decision`, `Retention`)
- Tags (free-form, multi-select, color-coded, `tags` store in IDB)
- Cadence target per project (`cadenceTarget: { count, period }`)
- Dashboard: `CadenceCard`, `PublishingHeatmap`, `DistributionCard`, `GapStrip`
- Default checklist + per-item slug/route
- JSON export / import / reset
- **N1** — Command palette (`Cmd/Ctrl+K`, `Cmd/Ctrl+P`) with navigation + quick-capture modes. `src/components/CommandPalette.tsx`, `src/app/AppCommands.tsx`
- **N2** — Idea Inbox page (`/inbox`) + Recently Viewed sidebar section (ring buffer cap 8 in `AppSettings.recentItemIds`, DB v3). `src/pages/Inbox.tsx`, sidebar section in `AppLayout`
- **N3** — Global keyboard shortcuts (`n`, `/`, `c`, `g d`, `g p`, `g i`, `?`) with input-focus guards and two-key chord window. `src/hooks/useKeyboardShortcuts.ts`, `src/components/ShortcutsHelpModal.tsx`
- **Project detail page** — `/projects/:id` route with header (color dot, name, description, edit/new actions, CadenceCard), filter bar, and scoped content list. Palette + Projects-list card clicks both navigate here. `src/pages/ProjectDetail.tsx`, `src/components/ProjectEditModal.tsx`, `src/utils/filterContent.ts`.
- **N4** — Drag-to-reschedule on desktop calendar. `@dnd-kit/core` with 5px activation distance. Every day cell droppable (including empty days). `src/pages/CalendarView.tsx`.
- **Chrome polish / rebrand to "Content Flow"** — Lovable metadata removed, `lovable-tagger` purged, `public/favicon.svg` (rounded-square `#243958` + white calendar-checkmark), theme-aware `<Sider>`, sidebar logo, About + Privacy footer modals, GH Pages base path hardcoded to `/content-flow/`. Commit `3849740`.
- **Header slot system** — `src/layout/HeaderSlots.tsx` with `useHeaderCenter` / `useHeaderActions` hooks. Breadcrumb lives in center slot, page actions in right slot. Page-level titles + inline primary buttons stripped. Commit `7217cd6`.
- **N5** — Bulk edit on ContentList. Desktop `<Table>` `rowSelection`, mobile "Select" toggle. Header toolbar swaps in when `selectedIds.length > 0`: Status / Project / Shift date / Add tag / Remove tag / Delete. Full-snapshot undo via toast (6s), `contentRepo.restore` added. Selection pruned when filters hide items, cleared on unmount. `src/components/BulkActionsToolbar.tsx`.

### Follow-ups noted
- "New project" palette action navigates to `/projects?new=1` but Projects doesn't read the param. Fix or drop. ~5 min.
- Mobile calendar day-drawer cramped on narrow viewports (from an earlier screenshot).
- Chrome commits not browser-smoke-tested yet: every route in light + dark, mobile breakpoint, long project name in breadcrumb, action-swap flicker on route changes.
- Calendar day-drawer "Add for this date" button stayed in the drawer (contextual to selected date). Dual-button with header's "New" — revisit if it feels clunky.
- Inbox lost its "N ideas" count when the page title was stripped. Sidebar badge next to "Inbox" nav item is the natural spot.

---

## 🎯 Now — Parent bridge (top priority)

**Why this is now, not later:** every feature we ship to a standalone-only app is a feature trapped on one device. Syncing across devices is the actual unlock that moves Content Flow from "demo" to "product." Once the bridge is in, users sign into Opsette once and Content Flow follows them. Without it, any effort on N6/N7/L* is compounding in the wrong direction.

This is the third tool to adopt the v1.1 postMessage bridge. Process Checklist and Script Builder paved the path. The parent-side infrastructure (migration, `/api/iframe-app-data` routes, `IframeAppViewer.tsx`, stub test page) already exists — this rollout is mostly child-side work.

**Planning done.** See `docs/BRIDGE_MIGRATION.md`. Three decisions locked:
- **Bridge mode (in Opsette iframe):** shared org scope. Presets + items both org-wide.
- **Standalone mode (direct tool URL):** IDB. Per-device, no sync.
- **No `per_user` scope** anywhere — not a supported mode.

Parent-app agent confirmed existing infrastructure covers Content Flow. Only config step is adding an `iframe_apps` row.

### ✅ B1. Leg 1 — Save-button UI + draft safety — **shipped**
Explicit Save on `ContentEditorDrawer` replaces autosave. Three localStorage keys: `content-flow.drafts.v1` (field-level patches), `content-flow.unsynced.v1` (ids), `content-flow.unsyncedRecords.v1` (full snapshots). Helpers in `src/lib/drafts.ts`, `src/lib/unsynced.ts`, `src/lib/dirty.ts`, `src/lib/cleanup.ts`. Shared `DirtyDot` component (6px amber) on ContentRow, ContentList/ProjectDetail title cells, calendar cells, Recent sidebar. `markUnsynced` called from drawer Save, bulk edit (+ undo), palette quick-capture, calendar drag, quick-status/duplicate from ContentList. Brand-new items don't hit IDB until Save — tentative uid held in draft only. Orphan draft cleanup runs after `seedIfEmpty` on boot. Dirty-dot reactivity via approach (b) — relies on `refresh()` re-render, no event emitter. **Known rough edge:** dot won't appear immediately after close-without-save until the next external render (route change, other mutation). If that feels laggy in browser testing, swap to an event emitter in `drafts.ts`. Spec line 275 takes precedence over the brief — no dirty-close modal, draft just persists silently.

### ✅ B2. Leg 2 Phase A — bridge scaffolding — **shipped**
`src/lib/bridge.ts` ported from Script Builder (envelope validation, 1s handshake / 5s per-request timeouts, origin allowlist `opsette.io` + `localhost:8081` + dev-only `localhost:8080` for harness). `savePresets` exposed as first-class method (Content Flow uses it; Script Builder doesn't). Value-type aliases `ContentFlowItemValue` / `ContentFlowMetaValue` exported for B3 call sites. `src/lib/bridgeInstance.ts` singleton (`getBridgeInstance` / `setBridgeInstance` / `isBridgeMode`) for non-React consumers. `main.tsx` chains `connectBridge().then(setBridgeInstance).then(render)`. Dev harness at `public/bridge-harness.html` — embeds child in iframe, echoes messages, acks every `save`/`delete`/`save_presets`. No repo/component/save-path changes.

### ✅ B3. Leg 2 Phase B — repos read/write through the bridge — **shipped**
Every repo is now bridge-aware. `contentRepo.create` / `update` / `duplicate` / `restore` route through a shared `persistItem` helper: marks unsynced → writes IDB cache → fires `bridge.save(id, item)` in bridge mode → on ack, clears drafts + unsynced + marks id parent-known. `contentRepo.remove` clears drafts/unsynced, then fires `bridge.delete(id)` only if the parent has heard of the id (tracked via `parentKnownIds` set in `bridgeInstance.ts` — populated from `init.items` on boot, added on ack). Projects + tags live in `iframe_apps.presets` via `bridge.savePresets`, NOT in `iframe_app_data` — no meta row. Every `projectsRepo` / `tagsRepo` mutation triggers `flushPresetsFromIdb` (builds `{ projects, tags }` from IDB + ships). Project/tag deletes detach content items and fire per-item `bridge.save` in parallel with the presets flush. `settingsRepo` splits in bridge mode: `theme` / `globalProjectFilter` / `recentItemIds` route to `content-flow.device.v1` localStorage (new `src/lib/device.ts`), never upstream. `seedIfEmpty` is a no-op when bridge is present. New `hydrateFromBridge(bridge)` in `src/db/index.ts` clears IDB and seeds from `init.presets.projects/tags` + `init.items`, overlays `unsyncedRecords` for ids the parent has never seen. `main.tsx` gates render on hydration and installs a 1s-debounced `message.error` toast on `bridge.onTimeout`. Component-layer `markUnsynced` / `clearUnsynced` / `clearDraft` calls removed — repo owns the lifecycle now. Bulk toolbar swapped `Promise.all` → `Promise.allSettled` so one failure doesn't break a batch. **Material deviation from the brief:** no `content-flow.meta` row — spec (BRIDGE_MIGRATION.md line 121) is unambiguous that presets is exactly `{ projects, tags }` and settings are device-local.

### B4. Leg 2 Phase C — migration guard + iframe detection — **S**
- `content-flow.migrated` localStorage key so the legacy IDB→bridge migration runs at most once.
- `connectBridge` returns `null` when `window.parent === window` (standalone), in which case everything continues to use IDB.
- First iframe load: if `init.items.length > 0`, ignore local IDB entirely (parent is source of truth). If empty, present-IDB-data migration path — TBD with parent agent.

### B5. Data-loss banner for standalone — **S**
- When running standalone (no bridge), show a dismissible banner on first load: "Your data stays in your browser — export regularly, or sign in to Opsette to sync across devices."
- Dismissed state in `AppSettings`.
- Natural upsell. Costs nothing.

---

## 🎯 Next (after bridge is live)

Re-scoped based on the product thesis conversation. Three items. Stop there and wait for feedback.

### N7. Snooze / defer — **S**
- Per-item action: "Snooze 1d / 3d / 1w / custom"
- Shifts `publishDate` forward; no new schema needed unless we want a separate `snoozedUntil` for audit. Start without.
- Adds a clear solo-operator value: "I'm not ready, push it."

### Medium-specific default checklists — **S** (reduced N6)
- When a content item is created, the default checklist is derived from the item's `medium`. Hardcoded mappings in `src/db/types.ts`:
  - Video → thumbnail designed, description written, end-screen set, …
  - Article → meta description, featured image, internal links planned, …
  - Newsletter → subject line, preheader, CTA finalized, …
  - Podcast → show notes, timestamps, guest approval, …
  - (Article/Guide/Landing Page/Short/Email/Social/Webinar each get their own)
- **No gating.** No required/optional distinction. No block-publish. Just sensible defaults.
- Users can still edit the checklist per-item after creation.
- If the medium changes after creation, offer (via a small prompt in the editor drawer) "switch to {medium} checklist?" — non-destructive; user confirms.

### "This week" dashboard card — **S**
- New card on Dashboard: grouped list of every item with `publishDate` in the next 7 days, sorted by date, grouped by day.
- Most useful Monday-morning glance for a solo operator: "what's going out this week across all projects."
- Reuses existing `ContentRow` component.

---

## 📦 Later — Keep (if people ask)

Everything here is on hold pending actual user feedback. Don't build proactively.

### L3. Repurposing links — **M**
Single-operator workflow: "this video became this blog post." Any item can reference another as `derivedFrom: itemId | null`. Compact "derivatives tree" in the editor drawer. Useful for solo operators repurposing one piece of work into many formats.

### L4. Content templates — **M**
Save an item as a template, "New from template…" in palette. Palette integration already exists — the template store is the only missing piece.

### L5. Editorial discipline (reduced)
**Keep:**
- `draftDueDate` separate from `publishDate` — S
- "Last touched N days ago" badge on stale drafts — S

**Drop:**
- Word count progress bar (over-engineered for a planner that doesn't hold the actual draft)
- Time estimates + weekly load on calendar (fuzzy data nobody actually maintains)
- Reading-time auto-calc (premature)

### L6. Light SEO (reduced)
**Keep:**
- Slug suggester from title (kebab-case) — S
- Title length indicator (50–60 char) — S
- Cannibalization warning (two items sharing primary keyword) — S
- Slug collision warning — S

**Drop:**
- Keyword library per project (fine as derived view over existing fields; don't build a dedicated store)
- Internal link planner (team-content-strategy territory, not solo)

### L7. Exports — **M**
- iCal export (`.ics`) of items with `publishDate` — highest-value piece. Lets solo operators overlay their content schedule on Google/Apple Calendar alongside appointments.
- Markdown export of brief + checklist per item — S, ship alongside
- Print-friendly monthly calendar — drop unless requested

---

## 🗑️ Dropped (was in roadmap, cutting)

- **N6 gating** — block-publish behind required checklist items. Solo operators don't need permission systems. Kept the "suggested checklist per medium" idea in the reduced Next section; dropped the required/optional schema and the publish-gate logic.
- **L1 recurring content** — niche for solo operators; adds a scheduler + reconciliation UI for limited return. Revisit if asked.
- **L2 series / clusters** — pillar + supporting tree view. This is SEO-team teamware. Solo operators don't think in pillars, or if they do, the whole project IS the pillar.
- **L6 internal link planner** — see above, dropped.
- **L5 word count / time estimates / reading time** — over-engineered for a planner.
- **Public read-only share link** — needs a backend. Out of scope.

---

## 🗄️ Parked

Nothing currently parked. Either it's on a list above or it's dropped.

---

## Suggested next session

**Plan B1 (Leg 1: Save button + draft tracking) as its own breakout.** The bridge plan then rolls out in three further sessions (B2, B3+B4 together, B5 last), each small and reviewable. Parent-app agent gets a parallel brief describing the protocol Content Flow will speak — identical to script-builder's, with the `meta`-row addition for projects/tags/settings.
