---
name: Content Flow → Opsette iframe bridge migration
description: Planning doc for porting the v1.1 postMessage bridge into Content Flow. Each content item becomes one iframe_app_data row; projects + tags live in iframe_apps.presets (org-shared vocabulary, like Process Checklist's categories). Nothing shipped yet — this is the hand-off brief for the B1–B5 implementation breakouts.
type: project
---

Content Flow (repo: `Opsette-Tools/content-flow`, deploys to GitHub Pages at `https://deebuilt.github.io/content-flow/`, eventually `https://tools.opsette.io/content-flow/`) is being converted from a standalone IDB-backed planner to a marketplace app that runs inside an Opsette iframe. Per-item content persists in `iframe_app_data` (one row per `ContentItem`). Org-shared vocabulary (projects, tags) persists in `iframe_apps.presets` JSONB — exactly the pattern Process Checklist uses for its category vocabulary.

**Why:** Content Flow is the third tool to adopt the v1.1 pattern (after Process Checklist and Script Builder). Without the bridge, every feature is trapped on one device — and sync across devices is the real product unlock. The parent-side infrastructure (`presets` column, `iframe_app_data` table, `/api/iframe-app-data` routes, `IframeAppViewer.tsx`) already exists from Process Checklist + Script Builder rollouts, so this migration is almost entirely child-side work.

**How to apply:** When implementing, follow the B1 → B5 leg breakdown in [NEW_FEATURES.md](NEW_FEATURES.md). The key behavioral change is dropping autosave in the editor drawer in favor of an explicit Save button — that's Leg 1 and has to ship before the bridge is wired. Do NOT mix IDB reads with bridge reads in the same session: decide once at boot.

Content Flow sits somewhere between the two reference tools:
- **Like Process Checklist:** uses `presets` for org-shared vocabulary (projects + tags are the equivalent of checklist categories — every content item references them by id).
- **Like Script Builder:** has many "items" per user that are the primary content; each gets its own `iframe_app_data` row with a UUID `data_id`.

---

## Shipped commits on `main`

- _(pending)_ — B1: Leg 1: explicit Save on `ContentEditorDrawer` + draft safety keys (`content-flow.drafts.v1`, `content-flow.unsynced.v1`, `content-flow.unsyncedRecords.v1`), dirty-dot indicators, unsaved-changes warning
- _(pending)_ — B2: Leg 2 Phase A — bridge scaffolding (`src/lib/bridge.ts`, gated render in `main.tsx`)
- _(pending)_ — B3: Leg 2 Phase B — repos read/write through the bridge (content items as per-row, projects + tags via `save_presets`), optimistic Delete, device-local draft alert
- _(pending)_ — B4: Leg 2 Phase C — `content-flow.migrated` guard, iframe detection, first-load parent-wins semantics
- _(pending)_ — B5: Standalone data-loss banner

---

## Protocol the child speaks (v1.1)

Identical envelope and message shapes as Process Checklist + Script Builder. Every message has envelope: `{ source: 'opsette', version: 1, type, ... }`. Envelope is validated on every inbound — any mismatch is dropped.

**Origin allowlist (both directions):** `https://opsette.io` (prod) and `http://localhost:8081` (Opsette's Next.js dev port). Child posts `ready` to *both* origins on mount; browser drops the wrong one silently.

**Child → Parent:**
- `ready` — on mount, once. No payload beyond envelope.
- `save { request_id, data_id, value }` — one `ContentItemValue` blob (see "Value shape for items" below). `data_id` is the item's UUID. Same `data_id` on subsequent saves = update.
- `save_presets { request_id, presets }` — full `ContentFlowPresets` blob (see "Presets shape" below). Overwrites `iframe_apps.presets` JSONB.
- `delete { request_id, data_id }` — fire-and-forget, UI already advanced. Only ever fired against content-item `data_id`s.

**Parent → Child:**
- `init { presets, items }` — sent synchronously in response to `ready`. `presets` is the `ContentFlowPresets` blob from `iframe_apps.presets` (or `{}` for brand-new install). `items` is `[{ data_id, value }, ...]` of content-item rows from `iframe_app_data`.
- `saved { request_id, data_id, updated_at }` — ack for item `save`.
- `presets_saved { request_id, updated_at }` — ack for `save_presets`.
- `deleted { request_id, data_id }` — ack for item `delete`.
- `error { request_id, message }` — rejects the pending promise for that `request_id`.

**Timeouts:**
- Handshake: 1s. If no `init` from a trusted origin arrives within 1s, the bridge resolves to `null` and the app renders in standalone IDB mode.
- Per-request save/delete/save_presets: 5s. On timeout the child rejects the pending promise and fires `onTimeout` so the app can toast.

**Late-init edge case:** if `init` arrives *after* the 1s window, the bridge has already resolved to `null`. Ignore the late `init`. Do not attempt to reconfigure.

**Duplicate init:** if a second `init` arrives after the first, ignore it. The bridge is a one-shot handshake.

**Save with no ack within 5s:** toast "Couldn't save — try again", keep the draft in `content-flow.drafts.v1` / `content-flow.unsyncedRecords.v1` / `content-flow.presets.unsynced.v1` so the user doesn't lose work. Match Process Checklist + Script Builder behavior.

**Source file (to be created):** `src/lib/bridge.ts` — should be a near-verbatim port of `c:\Opsette Tools\script-builder\src\lib\bridge.ts`. No protocol changes.

---

## Value shape for `save` (per content item)

One `iframe_app_data` row per `ContentItem`. `data_id` = the item's UUID (the `id` field of `ContentItem`, which Content Flow already generates via `crypto.randomUUID()`).

```ts
{
  data_id: string;           // UUID, same as the row's data_id
  title: string;
  projectId: string | null;  // references a project id in presets.projects
  slugOrRoute: string;
  contentType: ContentType;
  medium: Medium;
  funnelStage: FunnelStage;
  tags: string[];            // tag ids, each referencing a tag in presets.tags
  primaryKeyword: string;
  secondaryKeywords: string[];
  publishDate: string | null; // ISO date YYYY-MM-DD
  status: ContentStatus;
  briefNotes: string;
  checklist: Record<string, boolean>;
  createdAt: number;         // ms since epoch
  updatedAt: number;         // ms since epoch, bumped on each save
}
```

**No `__kind` or `type` field inside the blob.** `iframe_app_data` rows are single-type by convention (same as Script Builder + Process Checklist); every row is a content item.

**No `id` field separate from `data_id`.** Today `ContentItem.id` exists; on the wire it appears as `data_id`. In the child's in-memory state we can keep using `id` for continuity (the repos + UI code are built around it), but the wire payload spells it `data_id`. The bridge adapter translates between the two.

Realistic payload size: 0.5–3 KB per item (checklist is short keys + booleans; `briefNotes` is the only free-text field of any size and has no enforced max). Power user with 500 items = ~1 MB total spread across 500 rows. Well under the per-row 1 MB limit.

---

## Presets shape for `save_presets`

Content Flow's presets live in `iframe_apps.presets` JSONB (org-shared, 256 KB cap). This is the direct analog of Process Checklist's category vocabulary. Shape:

```ts
{
  projects: Array<{
    data_id: string;           // was Project.id — rename on the wire
    name: string;
    description?: string;
    color: string;             // hex or ant color keyword
    cadenceTarget: { count: number; period: 'week' | 'month' } | null;
    createdAt: number;
    updatedAt: number;
  }>;
  tags: Array<{
    data_id: string;           // was Tag.id
    name: string;
    color: string;             // ant color keyword
    createdAt: number;
  }>;
}
```

Content items reference presets entries by `data_id` (via `projectId` and `tags[]`), exactly the way Process Checklist steps reference categories by `categoryId`.

**Presets is exactly two fields: `projects` and `tags`. Nothing else. Settings are device-local.**

**Realistic size:** a heavy user with 20 projects + 100 tags = ~8 KB. Stays well under the 256 KB cap. If a future feature (e.g., per-medium default checklist templates, L4) wants to live in presets, re-evaluate — that's the one place payload could grow meaningfully.

**Settings that do NOT go in presets:**
- `theme` — personal UI preference. Device-local.
- `globalProjectFilter` — session-y filter state. Device-local.
- `recentItemIds` — updated on every editor open; would cause absurd preset churn. Device-local.
- `seeded` — internal bookkeeping from standalone mode. Irrelevant under bridge (parent is truth; nothing gets auto-seeded in bridge mode).
- Standalone data-loss banner dismissed flag — device-local.

See "Device-local behavior" below for where these actually live.

**Org-wide sharing is the intended semantics.** Content planning in Content Flow is a team activity, not a personal one — projects, tags, AND content items are all shared across the org. `iframe_apps.presets` is org-scoped by construction (one row per app), and `iframe_app_data` rows run under `storage_scope: 'shared'` (the only non-local scope post-v1.1). A user creating a content item in their org sees every other org member's items, and vice versa. Standalone mode (IDB fallback when there's no bridge) is the only per-device path — there is no `per_user` bridge mode and no plan to add one.

---

## Behaviors the parent should observe

**On iframe load:**
1. Child posts `{ source: 'opsette', version: 1, type: 'ready' }` to `window.parent` (both allowed origins).
2. Parent replies synchronously with `{ source: 'opsette', version: 1, type: 'init', presets: {...}, items: [...] }`. Child budgets 1s.
3. Child hydrates projects + tags from `presets` (seeding empty arrays if `presets` is `{}`). Hydrates content items from `items`.
4. Child reads `content-flow.drafts.v1` / `content-flow.unsyncedRecords.v1` / `content-flow.presets.unsynced.v1` and overlays any drafts whose `data_id` is in `items` (or, for presets, any unsynced presets edits that haven't acked). Drafts for unknown `data_id`s are discarded.

**First-run inside Opsette (brand-new install, `init.presets = {}` and `init.items = []`):**
- Child renders the empty state. No seeded demo data is fired off (the IDB-mode seeder is explicitly skipped under bridge).
- On the user's first content-item create, the child fires `save` immediately with the default blank shape so the parent has a record and the item gets a stable `data_id`. The dirty-dot / Save-button flow kicks in on the user's first *edit* to that item.
- First project create / tag create likewise fires `save_presets` immediately with the new projects/tags array. (Creating a vocabulary entry is a structural commit, not a "dirty edit" under our rule; see Decision 2 for the carve-out.)

**On Save click (content editor drawer):**
- Child diffs `drafts` vs. loaded items for the active item (or, for the "flush all dirty" case, all dirty items). For each dirty item, fires `save` in parallel. `Promise.allSettled` awaits acks.
- If presets are also dirty (e.g., the user renamed a tag earlier but hadn't acked yet), the one flush also fires `save_presets`. One Save click, all acks in parallel, one toast.
- Single toast: "Saved" (or "Saved N items" if the user had a batch).
- On any timeout: "Couldn't save — try again in a moment". Drafts stay in localStorage.
- After a successful ack, the draft is removed from `content-flow.drafts.v1` and the item's `updatedAt` bumped to the ack's `updated_at` or local time. After a presets ack, `content-flow.presets.unsynced.v1` is cleared.

**On drag-to-reschedule in the calendar:**
- **Behaves like autosave.** Single-field commit (`publishDate`) on drop, fires `bridge.save` for that one item immediately. No Save button, no draft.
- Reasoning: this is a direct manipulation gesture (like a to-do app checkbox). Forcing the user to click Save after every drag would break the feel of the interaction and the user's mental model. It's also one message per gesture, which is not chatty in aggregate.
- If the save fails, revert the local optimistic update and toast "Couldn't save — try again".

**On bulk actions (`BulkActionsToolbar`):**
- Status change / project change / shift date / add tag / remove tag all currently write to IDB via `contentRepo.update` per item. Under bridge mode, each modified item fires `bridge.save` in parallel. `Promise.allSettled` awaits — on any rejection, show one toast "Some items failed to save" and leave the failed items in drafts. No partial rollback.
- Bulk delete: `bridge.delete` per item, optimistic. The existing 6-second undo toast snapshots the pre-delete items; under bridge mode the Undo handler calls `bridge.save` per restored item in parallel. Undo keeps working.
- Bulk edit undo: `bridge.save` per restored snapshot, parallel.
- If bulk add-tag creates a *new* tag (previously unknown tag id), the presets array also changes. Order: fire `save_presets` first (so the tag exists in the parent's presets row), then fire the per-item `save`s for the affected items. Alternatively, fire both in parallel — the parent upserts both surfaces independently and the tag will resolve. Recommended: parallel is simpler; if the presets save fails but items succeed, the items will reference an id that's only in the child's local state. On next load the child detects this (tag id in item but not in presets) and re-fires `save_presets`. Document as a known reconcile case.

**On project CRUD, tag CRUD:**
- Mutate local state, fire one `save_presets` immediately. These are low-frequency writes.
- Tag rename / recolor: fires one `save_presets`. Items referencing the tag don't need to be re-saved (they store tag ids, not names).
- Project rename / recolor / cadenceTarget change: same — one `save_presets`, no per-item churn.
- Project delete: one `save_presets` (removes the project from the list) AND one `save` per content item whose `projectId` was detached to `null`. Current `projectsRepo.remove` already does the detach; under bridge the extra saves fire in parallel.
- Tag delete: one `save_presets` AND one `save` per content item that had the deleted tag (identical pattern). Existing `tagsRepo.remove` already handles the detach.

**On Delete (single-item):**
- Optimistically remove the item from UI state, fire `bridge.delete`. Errors swallowed.
- If the item being deleted was still unsynced (never acked by parent), skip `bridge.delete` — nothing to delete upstream. Clear `content-flow.unsynced.v1` / `content-flow.unsyncedRecords.v1` entries.
- If the deleted item appeared in `recentItemIds`, strip it from local state. The presets row does NOT ship — `recentItemIds` is device-local (see below).

**On theme toggle, globalProjectFilter change, standalone banner dismiss:**
- Device-local write only. Never fires any bridge message. Stored in a dedicated localStorage key (`content-flow.device.v1`) in bridge mode.
- (In standalone, these still go through the existing `settingsRepo` → IDB path.)

**On standalone load (tool URL opened directly, not in iframe):**
- `connectBridge` returns `null` in <1ms (no handshake attempted) because `window.parent === window`.
- Child uses IDB for everything. Full offline / PWA behavior preserved.
- The B5 data-loss banner shows once on first standalone load and can be dismissed (dismissed flag lives in IDB only — never syncs).

**The child NEVER:**
- Reads individual rows. Only the `init` push.
- Sends an unsolicited message outside of `ready` / `save` / `save_presets` / `delete`.
- Retries a failed save on its own.
- Mixes IDB and bridge within a single session. Decides once at boot (bridge present or null), sticks with it.
- Ships `theme`, `globalProjectFilter`, `recentItemIds`, `seeded`, or the standalone banner's dismissed flag inside presets.

---

## Local→cloud migration (first iframe load after a user had local IDB data)

**Decision: option (c) — no migration.** If the parent's `init.items.length > 0` OR `init.presets` has any projects/tags, the child skips local IDB entirely. If both are empty (brand-new install), the child also skips — it does *not* auto-import IDB data, and it does *not* prompt the user to import.

**Rationale:**
- Consistency with Script Builder and Process Checklist — both skip local migration entirely (Process Checklist doc Q3: "If parent's init returns ANY items, skip migration entirely"). Mixing behavior across tools confuses users who know the pattern from one tool.
- Content Flow is explicitly positioned as "standalone is a demo, not a product" (see NEW_FEATURES.md opening). Users who built real work in standalone are expected to be rare, and the explicit JSON export is the documented escape hatch (already shipped, reachable from settings).
- Auto-migration is dangerous: we don't know whose account the user signed into. Their local IDB might be a test scratchpad they don't want in their main account.
- Interactive migration (prompt on first load) adds a one-off UI surface that has to render before the bridge is fully trusted, and bugs there bleed into the primary flow.

**What we do instead:**
- Ship the B5 standalone banner. It says "Export regularly, or sign in to Opsette to sync." The existing JSON export is the user-facing migration tool. A user who wants their IDB data in Opsette exports JSON standalone → signs into Opsette → opens Content Flow in the iframe → uses Import JSON (already shipped via `importAllJson`). Under bridge mode, Import JSON fires one `save` per item and one `save_presets` for projects + tags.
- The `content-flow.migrated` localStorage key is still written on first iframe boot so that if we ever change our minds about option (c), we know which devices have already been through the one-way door.

**Open question for parent agent (carried over):** under bridge mode, the Import JSON flow could fire a flood of ~50–500 parallel `save` calls. Does the parent's `/api/iframe-app-data` route handle that burst cleanly, or do we need to throttle to a rolling batch of N? See Open Question #2 below.

---

## Draft safety / device-local behavior (user-visible)

### localStorage keys (bridge mode only)

- `content-flow.drafts.v1` — JSON object `{ [data_id]: Partial<ContentItem> }`. Field-level patches for items whose user has typed in the editor drawer but not clicked Save. Survives tab refresh.
- `content-flow.unsynced.v1` — JSON array of `data_id`s that have local changes the parent doesn't know about yet (covers brand-new items plus any item whose structural save hasn't landed).
- `content-flow.unsyncedRecords.v1` — JSON object `{ [data_id]: ContentItemValue }` snapshots so the full record survives a reload even if parent has never seen it. Mirrors Script Builder.
- `content-flow.presets.unsynced.v1` — JSON blob holding the latest unsynced presets value. If a tag rename is pending a `save_presets` that hasn't landed yet, this is what a tab refresh restores from. Separate from the per-item keys because presets has a known single destination.
- `content-flow.device.v1` — device-local non-synced state: `{ theme, globalProjectFilter, recentItemIds, standaloneBannerDismissed }`. Never goes upstream. Per-browser-per-device.
- `content-flow.migrated` — boolean, written once on first iframe boot (per Decision 4: no-op migration, just a future-proof breadcrumb).

### IDB and localStorage coexist — how

Storage has two layers, and they never mix within a session:

```
┌─────────────────────────────────────────────────────────────────┐
│ STANDALONE MODE (window.parent === window OR handshake timeout) │
│                                                                 │
│   UI reads/writes ───► IDB (via existing repos)                 │
│                        │                                        │
│                        └── exportAllJson / importAllJson UI     │
│                                                                 │
│   localStorage bridge keys are IGNORED (they may be empty or    │
│   stale from a previous bridge session — don't care).           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BRIDGE MODE (parent + init received within 1s)                  │
│                                                                 │
│   init.presets ─► in-memory state (projects, tags)              │
│   init.items   ─► in-memory state (content items)               │
│                                                                 │
│   UI reads ◄─── in-memory state                                 │
│                                                                 │
│   UI writes ───►│── dirty ──► localStorage drafts / unsynced    │
│                 │             (survive refresh until ack)       │
│                 │                                               │
│                 └── Save / drag / bulk / delete / presets ──►   │
│                     bridge                                      │
│                                                                 │
│   Device-local (theme, filter, recents, banner) ───►            │
│     content-flow.device.v1 (localStorage) — never syncs         │
│                                                                 │
│   IDB is IGNORED after the first load. It may still contain a   │
│   user's old standalone data; we do not read it and do not      │
│   write to it. (Not cleared either, in case the user signs out  │
│   and goes back to standalone.)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Gotcha the implementer must not miss:** in bridge mode, `contentRepo` / `projectsRepo` / `tagsRepo` / `settingsRepo` as they stand today write to IDB. Those repos need a bridge-aware seam (or a thin wrapper that routes to either IDB or bridge+drafts depending on `window.__opsetteBridge`). The cleanest shape is a new layer like `src/db/store.ts` that each page uses instead of talking to `contentRepo` directly; the existing repos stay as the IDB backend behind that layer. Leg B3 decides the exact shape.

### UX for dirty state

- Dirty dot next to an item in `ContentList` and calendar when `drafts[item.id]` is non-empty or the item is in `unsynced`.
- Dirty dot on the presets admin surfaces (Projects page, tag picker) when there's an unacked presets edit.
- Warning alert above the editor drawer when the drawer's item is dirty: *"Unsaved changes — only stored on this device until you click Save."*
- No modal on drawer close. Closing preserves the draft. The next time the user opens that item, the draft rehydrates.

---

## Unblocked for parent-side work

**Contract the parent must honor (already built for Process Checklist + Script Builder):**
1. `iframe_apps.presets JSONB NOT NULL DEFAULT '{}'::jsonb` exists (256 KB cap).
2. `iframe_app_data` uses `(organization_id, iframe_app_id, data_id)` uniqueness. Content Flow writes one row per content item.
3. `/api/iframe-app-data` routes accept the v1.1 shape as-is: GET returns `{ presets, items }`; POST upserts one item; PUT saves presets; DELETE removes one item by `data_id`. No Content Flow-specific adjustments needed.
4. `IframeAppViewer.tsx` routes the 7-message v1.1 protocol. No changes needed.
5. The pre-fetch-before-mount pattern from Process Checklist's shipping (see `dff3cae0` notes) is already in place — parent has bootstrap data ready before the iframe mounts, so the 1s handshake wins reliably.

**Parent-side TODO for Content Flow launch (if anything):**
- Verify Content Flow is registered in `iframe_apps` with the Content Flow GH Pages URL as `child_url`. Default `storage_scope` for marketplace install: `shared` (the only non-local post-v1.1 option).
- Answer the Open Questions below before B3 lands.

**Parent does NOT need to:**
- Add any Content Flow-specific logic. The tool speaks the exact same protocol as Process Checklist + Script Builder.
- Migrate data. Standalone users losing IDB data on cutover is a known tradeoff (see Decision 4).
- Know the shape of `presets` — it's opaque JSONB from the parent's perspective.

---

## Open questions for parent-app agent

1. **Presets size risk.** Content Flow's initial presets payload (projects + tags) stays well under the 256 KB cap (~8 KB realistic). But if we later move per-medium default checklist templates (roadmap N6) into presets, that could push close to 50–100 KB. Is the 256 KB cap firm, or is there headroom for tools that accumulate richer vocabulary over time? If firm, we'd keep templates in a separate `iframe_app_data` row with `isTemplate: true` (Process Checklist pattern).

2. **Batched save back-pressure.** Import JSON or bulk-edit can produce ~50–500 parallel `save` calls in a burst. Does the parent's `/api/iframe-app-data` route survive that? If not, what's the safe concurrency (3? 10?) so the child can throttle? Only open question that could change Leg B3's implementation meaningfully.

3. **Org-shared semantics — RESOLVED (2026-04-24).** Content planning is a team activity; `shared` is intended. Every org member sees the same projects, tags, AND content items. No `per_user` scope exists in v1.1 and none is needed. Standalone/IDB is the only per-device path (it's the fallback when there's no bridge — opened directly at the tool URL).

4. **`save_presets` race.** If two users in the same org both edit the projects list at the same time, the parent does last-writer-wins on the whole JSONB (per Process Checklist Q2 answer). Is that still the v1.1 contract, or has optimistic locking shipped since? No action if last-writer-wins is still correct — flag if the semantics changed.

---

## Reference implementations

- **Process Checklist** (closest analog for the presets surface — org-shared vocabulary referenced by id from data rows): memory doc at `C:\Users\ruthn\.claude\projects\c--opsette-opsette-v2\memory\project_checklist_tool.md`. Particularly the Phase 2/3 sections and the "v1.1 revisions" Q&A. Content Flow's use of `presets` mirrors Process Checklist's use of it for categories.
- **Script Builder** (closest analog for the items surface — many UUID-keyed rows per user): memory doc at `C:\Users\ruthn\.claude\projects\c--Opsette-Tools-script-builder\memory\project_script_builder_iframe.md`. Bridge at `c:\Opsette Tools\script-builder\src\lib\bridge.ts`. Gated render at `c:\Opsette Tools\script-builder\src\main.tsx`. Content Flow's `src/lib/bridge.ts` should be a near-verbatim port of Script Builder's.

## Places the Script Builder / Process Checklist playbooks didn't cleanly apply

1. **Two-surface storage shape (presets + items) is new to Content Flow among third-party tools.** Script Builder uses only `iframe_app_data` (no presets). Process Checklist uses both, but its presets is a single entity type (categories). Content Flow's presets holds two distinct entity types (projects + tags) in one blob. The `save_presets` payload is therefore structured (`{ projects, tags }`) rather than flat, and the child has to reconcile two independent collection-edits against one JSONB write. Not fundamentally different, but worth flagging: any tag-add that also touches a content item is TWO messages minimum, not one.
2. **Direct-manipulation gestures (calendar drag).** Neither reference tool has direct-manipulation edits. Script Builder edits all flow through a form with a Save button. Process Checklist save is global (one button flushes everything). Content Flow's drag-to-reschedule and bulk actions don't have a natural "Save" step. Resolved in Decision 5: drag = autosave, bulk = per-item parallel saves. That's a rule the reference docs don't cover.
3. **Device-local state (`theme`, `globalProjectFilter`, `recentItemIds`, standalone banner dismissed flag).** Neither reference tool has device-local UI state that matters. Content Flow does, and those values should NEVER go up the bridge — they'd cause either presets churn (if we bundled them) or create a phantom synced-but-not-really class of state. Called out in the Presets shape section and in "The child NEVER" list.
4. **Checklist on each item.** Realistically just a `Record<string, boolean>` — serialized fine. Not a wrinkle in practice, but it's the one field where payload can grow if we ship N6/L4 template-derived checklists. Flag for roadmap review if ever.

---

## Parent-side sign-off (2026-04-24)

Verified against Opsette main at commit `dff3cae0` ("feat(iframe-apps): bridge v1.1 — data_id-keyed storage + presets", 2026-04-18). Bridge v1.1 infrastructure is fully in place: `iframe_apps.presets` JSONB column, `iframe_app_data` with `(organization_id, iframe_app_id, data_id)` uniqueness, 7-message `IframeAppViewer.tsx`, pre-fetch bootstrap in `app/(dashboard)/tools/[id]/page.tsx`, CRUD routes at `app/api/iframe-app-data/route.ts`. Process Checklist and Script Builder are both live on it.

### Compatibility: the child plan in this doc matches the parent natively

- **Two-surface model approved.** The parent schema already separates presets (one JSONB column on the app row) from items (`iframe_app_data` rows). The `init` handler treats all item rows uniformly as `{ data_id, value }` — it does not inspect the `value` blob, does not expect heterogeneous row types within one app, and does not reserve any `data_id`s. Content Flow's "per-item rows + projects/tags in presets" maps 1:1.
- **No mixed-semantics `data_id` needed.** An earlier draft of this brief mentioned a reserved `data_id` for a meta blob — ignore that. The shipped doc (this file) already does it correctly via presets. The parent would not support a reserved-id pattern cleanly anyway; presets is the right surface.
- **Protocol: every message Content Flow sends is handled.** `ready` → synchronous `init { presets, items }`. `save` / `save_presets` / `delete` all have matching acks with `request_id` round-tripped. Envelope (`source: 'opsette'`, `version: 1`) matches.

### Dev port

Confirmed `http://localhost:8081` — `package.json` has `"dev": "next dev --port 8081 --turbopack"`. Origin allowlist of `https://opsette.io` + `http://localhost:8081` in `src/lib/bridge.ts` is correct as-written.

### Parent-side TODO to launch Content Flow

**One change only.** Append to `MARKETPLACE_APPS` in `app/(dashboard)/marketplace/page.tsx`:

```ts
{
  key: 'content-flow',
  name: 'Content Flow',
  description: '<short copy>',
  url: 'https://tools.opsette.io/content-flow/',
  icon: '<emoji>',
  color: '<hex>',
  tags: ['Marketing'], // or 'Productivity'
  storage_scope: 'shared',
},
```

No SQL, no schema change, no route change, no viewer change. Install flow runs through existing `useIframeAppsCrud.createApp` → inserts an `iframe_apps` row.

For dev testing before the `tools.opsette.io/content-flow/` domain is wired, the user can point `url` at `https://deebuilt.github.io/content-flow/` temporarily. Parent derives child origin from the app URL (`new URL(url).origin`), so outbound `postMessage` will target GH Pages correctly. The child's inbound allowlist stays as-is (it only cares about parent's origin, not its own).

### Answers to the 4 open questions

1. **Presets 256KB cap — firm.** If per-medium checklist templates later want to live there and push over, move them to `iframe_app_data` rows with an `isTemplate: true` flag (Process Checklist's pattern for templates). Don't expand the cap.
2. **~500-save burst.** Route handler survives — it's a thin wrapper over Supabase with no internal throttle. But browser caps concurrent fetches to ~6 per origin, so tail requests in a 500-item Import JSON will queue long enough to blow the child's 5s per-request timeout. Recommend child throttles Import JSON to batches of ~10 with serial batch boundaries, or surfaces per-batch progress rather than one "Saved" toast. Parent won't break either way; this is a UX call.
3. **Org-shared semantics — confirmed correct for Content Flow.** `shared` is the only v1.1 non-local scope (`per_user` was removed in the v1.1 migration). Every org member sees the same projects, tags, AND content items. Content planning is a team activity — there is no plan to add `per_user` back. The only per-device path is standalone/IDB (no bridge, tool URL opened directly).
4. **`save_presets` race: still last-writer-wins.** No optimistic locking shipped since. Behavior matches Process Checklist Q2's answer.

### Gotchas from Script Builder / Process Checklist worth repeating

- **Parent pre-fetches bootstrap before iframe mount** (commit `dff3cae0`). An earlier attempt fetched lazily on `ready` and lost the handshake race to Supabase cold-start (~1.1–1.5s vs. child's 1s handshake budget). Current code gates iframe render on `useIframeAppData`. Content Flow inherits this for free.
- **Parent responds to `ready` synchronously** from cached bootstrap (no async fetch inside the `message` handler). Do not expect this to change.
- **Cross-testing standalone → iframe shows empty items.** Per option (c) in this doc, the bridge does not migrate IDB. If a user tests standalone first, then opens inside Opsette on a brand-new account, their local data is not visible. Intended — but worth flagging so nobody reports it as a bug.
- **Origin checks are strict both directions.** If a staging origin (`staging.opsette.io`) is ever added, the child allowlist needs an update AND the parent's outbound posts are already correct (origin derived per-app from `url`).

### Sign-off on data model

Approved as-documented in this file:
- Per-item rows in `iframe_app_data`, keyed by `data_id = ContentItem.id`.
- Projects + tags vocabulary in `iframe_apps.presets` as `{ projects: [...], tags: [...] }`.
- Items reference presets entries by `data_id` (via `projectId` and `tags[]`).

No counter-proposal. Parent supports this natively. Ship whenever Legs B1–B5 are done; parent will add the `MARKETPLACE_APPS` entry at that point.

Parent-side memory doc: `C:\Users\ruthn\.claude\projects\c--opsette-opsette-v2\memory\project_content_flow_iframe.md`.
