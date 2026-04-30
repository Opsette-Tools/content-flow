// Opsette Header — per-app configuration template.
// Copy this to `src/components/opsette-header/config.ts` and fill in the fields.
//
// The `brandIconPaths` field is the inner SVG content (paths/lines/polylines)
// from this app's `public/favicon.svg`, with no outer <svg> wrapper. The
// OpsetteHeader component wraps it in a <svg viewBox="0 0 256 256"> that
// inherits color from the parent (.ops-header-icon { color: #2f4f46 }).
//
// To populate `brandIconPaths`:
//   1. Open this app's `public/favicon.svg`.
//   2. Copy everything between the opening `<svg ...>` tag and the closing
//      `</svg>`. Strip any `<rect ... fill="none"/>` placeholder if present.
//   3. Paste into the template literal below.
//
// Source SVGs also live at `_shared/brand-icons/sources/<slug>.svg` per
// ICONS_AND_BRANDING.md.

export type OpsetteHeaderConfig = {
  /** Tool name shown as the page H1. Match HEADER_BAR.md per-tool table. */
  toolName: string;
  /** Inner SVG content for the per-tool Phosphor brand icon (no outer <svg>). */
  brandIconPaths: string;
};

export const opsetteHeaderConfig: OpsetteHeaderConfig = {
  toolName: "REPLACE_ME",
  brandIconPaths: `
    <!-- Paste the inner content of public/favicon.svg here.
         Example (process-checklist / ListChecks):
    <line x1="128" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/>
    ...
    -->
  `,
};
