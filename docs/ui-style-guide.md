# Field Tools UI Style Guide

## Overview

Bridge Navigator (`njsearch.html`) and Fuel Finder (`njfuel.html`) are the **visual reference** for the shared app shell. When in doubt about spacing, color, topbar layout, card style, or button hierarchy — match those two pages.

---

## Shared CSS file

`css/field-ui.css` — loaded **before** each page's local `<style>` block:

```html
<!-- index.html (root) -->
<link rel="stylesheet" href="css/field-ui.css">

<!-- pages/*.html -->
<link rel="stylesheet" href="../css/field-ui.css">
```

Page-local `<style>` comes after the `<link>`, so page CSS wins on equal specificity. This is intentional — shared styles are defaults, per-page styles are overrides.

---

## ft-* class system (currently in field-ui.css)

| Class | Purpose | Status |
|---|---|---|
| `.ft-topbar` | Topbar shell (navy bg, gold border) — alias for `#topbar`/`.topbar` | Active |
| `.ft-back-link` / `.ft-home-link` | Gold pill back/home navigation — alias for `.topbar-back`/`.hub-back` | Active |
| `.ft-topbar-div` | 1px vertical topbar divider — alias for `.topbar-div` | Active |
| `.ft-topbar-spacer` | Flex spacer pushing right-side controls right — alias for `.topbar-spacer` | Active |
| `.ft-badge` | Gold pill label badge (topbar) — alias for `.state-badge` | Active |
| `.ft-help-btn` | 32px circle help button (topbar) — alias for `.topbar-help` | Active |
| `.ft-btn` | Base button (flex, padding, radius, weight, transition) | Active |
| `.ft-btn-primary` | Blue accent bg, white text | Active |
| `.ft-notice-local` | Amber left-border notice: "Saved on this device only…" | Active |
| `.ft-modal-backdrop` | Fixed full-screen modal overlay — add `.open` class to show | Active |
| `.ft-modal-box` | Centered modal content box with entrance animation | Active |
| `.ft-modal-title` | Modal heading (1.05rem, bold) | Active |
| `.ft-modal-actions` | Modal button row (right-aligned flex) | Active |

**Deferred classes (not in field-ui.css yet — add when first needed):**
`ft-btn-secondary`, `ft-btn-ghost`, `ft-btn-danger`, `ft-card`, `ft-section-card`, `ft-notice`, `ft-empty-state`, `ft-toast`, `ft-status-pill`. When you need one of these, add it to `css/field-ui.css` with a comment, then use it — do not define it locally in a page.

---

## Design tokens (from field-ui.css :root)

```css
--bg:        #eef0f4;   /* page background */
--surface:   #ffffff;   /* cards/panels */
--border:    #d1d9e0;
--border-lo: #e8ecf0;   /* subtle borders */
--accent:    #1a56db;   /* primary blue — buttons, links, focus */
--accent-lo: rgba(26,86,219,0.08);
--red:       #dc2626;
--text:      #111827;
--muted:     #6b7280;
--muted2:    #4b5563;
--radius-sm: 5px;
--radius:    8px;
--radius-lg: 10px;      /* pages may override locally — index/dc144 use 12px */
--sans:      'Inter', system-ui, -apple-system, Arial, sans-serif;
--transition: 0.14s ease;
```

Dark mode is toggled via `html[data-dark]` attribute on `<html>`. Dark mode token overrides are in `field-ui.css`. The global state key is `field_dark_mode` in localStorage (read-only on tool pages — only index.html writes it).

**Dark mode text color note:** Most pages use `--text: #FEE9A1` (gold) in dark mode. Milepost and Payroll Calculator override locally to `#f1f5f9` (neutral grey). Do not assume the default is grey.

---

## Brand colors (hardcoded, not in tokens)

| Role | Hex | Notes |
|---|---|---|
| Topbar background | `#1e2939` | Dark navy, always dark regardless of theme |
| Header accent / gold | `#E5B33B` | Topbar border, back pill, badges, help button |
| Back pill hover (light) | `#C9971A` | Darker gold on hover |
| Back pill hover (dark) | `#FEE9A1` | Light gold on dark background |
| Bookmark star | `#f59e0b` | Amber-500 — NEVER change to header accent gold |

---

## Action hierarchy

| Level | Purpose | Class |
|---|---|---|
| Primary | Search / Find Near Me / Export PDF or XLSX | `.ft-btn .ft-btn-primary` |
| Secondary | Save Draft / Refresh / Add Page | `.ft-btn` (plain) or local `.btn-secondary` |
| Danger | Clear Form / Delete Draft / Remove Page | local `.btn-danger` or `ft-btn-danger` when added |

Primary action must be visually strongest. Danger actions must be separated from primary actions.

---

## Local-storage notice

Add `.ft-notice-local` wherever the page saves user data to localStorage or IndexedDB:

```html
<div class="ft-notice-local">Saved on this device only. Export a backup for long-term storage.</div>
```

**Currently used on:** `njsearch.html` (bookmarks), `njfuel.html` (bookmarks), `dc144.html` (drafts/templates/photos), `timesheet.html` (entries/settings), `WorkOrderCloseout.html` (existing `.local-storage-note`).

**Do not add to:** `index.html` homepage tiles, `milemarker.html` (saves no user data).

---

## Modal pattern

Use `.ft-modal-backdrop` + `.ft-modal-box` for new help/confirmation modals. Toggle visibility with the `.open` class:

```html
<div class="ft-modal-backdrop" id="my-modal">
  <div class="ft-modal-box">
    <div class="ft-modal-title">How to Use This Tool</div>
    <p>Short help text.</p>
    <div class="ft-modal-actions">
      <button class="ft-btn ft-btn-primary" id="my-modal-close">Got it</button>
    </div>
  </div>
</div>
```

```js
document.getElementById('help-btn').addEventListener('click', function() {
  document.getElementById('my-modal').classList.add('open');
});
document.getElementById('my-modal-close').addEventListener('click', function() {
  document.getElementById('my-modal').classList.remove('open');
});
document.getElementById('my-modal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open');
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.getElementById('my-modal').classList.remove('open');
});
```

Existing pages use their own modal classes (`dc-modal-*`, `guide-overlay`, `guide-modal`) — do not rename those for styling reasons.

**z-index above Leaflet:** `.ft-modal-backdrop` is set to `z-index: 1050` in `field-ui.css` — above Leaflet's default `z-index: 1000` for `.leaflet-top`/`.leaflet-bottom` controls. Do not reduce map-control z-indexes as a workaround.

---

## How to Build a New Tool Page

### Required link

```html
<link rel="stylesheet" href="../css/field-ui.css">
```

Place this **before** the page-local `<style>` block, after the Google Fonts link.

### Basic page shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Tool Name — NJDOT Field Tools</title>
  <meta name="theme-color" content="#E5B33B">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/field-ui.css">
  <style>
    /* Tool-specific CSS only — shared tokens, topbar, buttons, modals are in field-ui.css */
    body { min-height: 100vh; }
    /* ... */
  </style>
</head>
<body>

<!-- Topbar -->
<div id="topbar">
  <a class="topbar-back" href="../index.html">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    Home
  </a>
  <div class="topbar-div"></div>
  <span id="topbar-title">Tool Name</span>
  <div class="topbar-spacer"></div>
  <span class="state-badge">NJ</span>
  <button class="topbar-help" id="tool-help-btn" type="button" aria-label="Open help">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </button>
</div>

<!-- Help modal -->
<div class="ft-modal-backdrop" id="tool-help-modal">
  <div class="ft-modal-box">
    <div class="ft-modal-title">How to Use</div>
    <ol style="padding-left:18px;line-height:1.7;font-size:14px;color:var(--text);">
      <li>Step one.</li>
      <li>Step two.</li>
      <li>Step three.</li>
    </ol>
    <div class="ft-modal-actions">
      <button class="ft-btn ft-btn-primary" id="tool-help-close">Got it</button>
    </div>
  </div>
</div>

<!-- Main content -->
<div class="wrap">

  <!-- Local-only notice — include ONLY if this page saves user data -->
  <!-- <div class="ft-notice-local">Saved on this device only. Export a backup for long-term storage.</div> -->

  <!-- Primary action -->
  <button class="ft-btn ft-btn-primary" id="primary-action-btn">Primary Action</button>

  <!-- Result / content area -->
  <div id="result-area"></div>

</div>

<script>
// Dark mode — read global state, never write it
if (localStorage.getItem('field_dark_mode') === '1') {
  document.documentElement.setAttribute('data-dark', '');
}

// Set last visited tool
try { localStorage.setItem('ft_last', 'toolname'); } catch(_) {}

// Help modal
(function() {
  var overlay = document.getElementById('tool-help-modal');
  var openBtn = document.getElementById('tool-help-btn');
  var closeBtn = document.getElementById('tool-help-close');
  if (openBtn && overlay) {
    openBtn.addEventListener('click', function() { overlay.classList.add('open'); });
    closeBtn.addEventListener('click', function() { overlay.classList.remove('open'); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') overlay.classList.remove('open'); });
  }
})();

// Smart header hide-on-scroll (copy from njfuel.html initSmartHeader if needed)

// Tool-specific JS only below this line
</script>
</body>
</html>
```

### Button hierarchy

```html
<button class="ft-btn ft-btn-primary">Primary Action</button>
<!-- When ft-btn-secondary is added to field-ui.css: -->
<!-- <button class="ft-btn ft-btn-secondary">Secondary Action</button> -->
<!-- <button class="ft-btn ft-btn-ghost">Quiet Action</button> -->
<!-- <button class="ft-btn ft-btn-danger">Danger Action</button> -->
```

Note: only `ft-btn` and `ft-btn-primary` are currently defined in `field-ui.css`. Add variants to that file when first needed — do not define them locally.

---

## Pre-flight checklist

Before finishing any new or modified page, verify:

- [ ] `css/field-ui.css` is linked before page-local `<style>`
- [ ] Topbar matches Bridge/Fuel visual pattern (navy, gold border, back pill, state badge, help button)
- [ ] Does not re-define shared tokens (`:root`), topbar shell, back pill, divider, badge, or focus ring
- [ ] New CSS is tool-specific only — no duplicated shared patterns
- [ ] Primary action is visually strongest on the page
- [ ] Danger actions are visually separated from primary actions
- [ ] Help button in topbar if the tool needs guidance (see milemarker for minimal example)
- [ ] `.ft-notice-local` present only if page actually saves user data to localStorage or IndexedDB
- [ ] No localStorage or IndexedDB keys renamed or cleared
- [ ] No export logic changed without explicit approval
- [ ] Mobile 390px and 430px layouts checked
- [ ] Desktop 1440px layout checked
- [ ] Dark mode checked (topbar always navy, text gold on most pages)
- [ ] `service-worker.js` `LOCAL_ASSETS` updated if new static files were added
- [ ] `CLAUDE.md` and `AGENTS.md` updated if new storage keys, classes, or behavior was added

---

## Rules

- Use `ft-*` classes before writing new CSS
- Do not create new one-off button/card/modal/topbar styles when a shared class exists
- If a new style is genuinely necessary, document why in this file
- Do not rename JavaScript IDs or classes for styling purposes
- Do not touch export layouts (`html2canvas` PDF area, ExcelJS template layout) for styling cleanup
- Link `css/field-ui.css` BEFORE page-local `<style>` so page CSS wins on equal specificity
- Animation / anti-flicker CSS stays **inline per-page** — NOT in `field-ui.css`
- Mobile zoom restriction (`user-scalable=no` in viewport meta) must stay in every page
- **50-line rule:** If adding more than 50 lines of new page-specific CSS, check whether it belongs in `css/field-ui.css` instead

---

## Overlay & Toast Rules (permanent — do not violate)

These rules prevent `position: fixed` overlays and toasts from breaking when the page is navigated to from the hub.

### Root cause

CSS animations with `animation-fill-mode: both` lock the final keyframe value at a higher cascade layer than inline styles. If the final keyframe is `transform: translate3d(0,0,0) scale(1)` (the identity), the browser still creates a **CSS containing block** for `position: fixed` descendants. All fixed children resolve relative to the body instead of the viewport during and after the animation. `transform: none` (the identity value written as the keyword) does **not** create a containing block.

`contain: layout` has the same effect — it creates a containing block for fixed children. `contain: paint style` does not.

### Rules

1. **Final animation keyframes must use `transform: none`** — not `translate3d(0,0,0) scale(1)` or `scale(1)`. This applies to every entrance animation on every page (`slideInFromLeft`, `slideInFromRight`, `slideInLeft`, etc.).

2. **Do not use `contain: layout` on `body`** — use `contain: paint style` instead. The `layout` value creates a containing block for `position: fixed` children.

3. **JS back-navigation handlers: clear with `''` not identity** — when initializing the body position for a JS-driven exit animation, set `body.style.transform = ''` (empty string) not `'translate3d(0,0,0) scale(1)'`. The empty string removes any inline transform without creating a stacking context.

4. **New overlays must be viewport-safe** — use `position: fixed` with explicit `top`/`bottom`/`left`/`right` (not `inset`) when safe-area-inset adjustments are needed. Prefer `inset: 0` only when no safe-area offset is required.

5. **Prefer `100dvh` over `100vh`** — dynamic viewport height accounts for mobile browser chrome (address bar collapsing). Use `100dvh` for any modal max-height, overlay height, or full-screen container. Use `100vh` only for desktop-only rules where the distinction doesn't matter.

6. **Toast containers: use `left: 50%` + `translateX(-50%)`** — never `right: Xpx`. This keeps toasts horizontally centered at any viewport width, including narrow phones and wide desktops.

7. **Safe-area insets for toasts and modals** — bottom toasts must account for the home indicator on notched devices. Use `var(--ft-toast-bottom)` (defined in `field-ui.css`) instead of a raw `bottom: Npx` value. Override the variable locally if the page has a bottom nav (e.g. timesheet adds `--ft-toast-bottom: calc(var(--nav-h) + 14px)`).

### Toast container shared CSS

`css/field-ui.css` Section 7 provides shared `#toast-ct` / `.toast-ct` / `.ft-toast-container` positioning. Individual pages do not need to redeclare `position`, `left`, `bottom`, `transform`, `z-index`, or `width` for their toast container. Pages may override `align-items`, `gap`, or `--ft-toast-bottom` locally.

### Pre-flight checklist for new pages

Before shipping any new tool page, test at viewport widths **390px**, **430px**, and **1440px**:

- [ ] Navigate from hub → page → back to hub. Do fixed-position toasts/overlays stay centered at the viewport during and after navigation?
- [ ] Open a modal/overlay while scrolled halfway down the page. Does it center on the visible viewport (not the document)?
- [ ] Show a toast while scrolled to the bottom of the page. Does it appear above the home indicator (or bottom nav)?
- [ ] Trigger the back-navigation exit animation. Do any fixed elements jump or shift during the 320–360ms exit?
- [ ] Test in both light and dark mode.
- [ ] Test with the mobile browser address bar both expanded and collapsed (`100dvh` correctness).

---

## Homepage command-center pattern (`index.html`)

The homepage is the one **command-center dashboard** in the app. It is the visual exception to "match Bridge/Fuel" — tool pages still follow the standard shell, but the homepage has its own richer identity. Both themes are the **same command-center concept**, just light vs. navy:

- **Light mode** = white / light navy-gray command center: subtle blueprint grid, softer navy/blue Pulaski Skyway wireframe, lighter NJ outline/network with a soft blue/cyan node glow, white/glass cards with navy text, soft blue-gray shadows + thin borders. Premium — **not** a plain white site.
- **Dark mode** = deep navy command center (approved mockup): cyan blueprint grid + radar rings, brighter cyan-glowing NJ nodes, translucent dark glass cards, blue/cyan/gold/purple accents.

Driven by the existing `html[data-dark]` / `field_dark_mode` toggle. The homepage **overrides all its tokens locally** in `index.html` (`:root` light, `html[data-dark]` dark) — it does not inherit field-ui's gold-on-near-black dark tokens. Do not let the toggle feel broken: both modes must look finished.

**Homepage-specific visuals stay inline in `index.html`** (not in `field-ui.css`) unless they become reusable across pages:
- **Pulaski Skyway wireframe** — inline `<svg>` (cantilever-truss linework), thin `currentColor` strokes at low-alpha tokens, `aria-hidden`. Labels must read **"PULASKI SKYWAY" / "STRUCTURE NO. 0901-150" / "CANTILEVER TRUSS BRIDGE"**.
- **NJ outline/network** — inline `<svg>`: `.nj-outline-path`, `.nj-link` connectors, `.nj-node` circles (+ `.is-major`). Micro-labels: compass N, LAT/LON.
- **Glowing nodes** — SVG `drop-shadow()` (`--node-glow`: subtle blue in light, stronger cyan in dark) + `@keyframes njPulse` (opacity only) on `.nj-node`, staggered, restrained; static under `prefers-reduced-motion`.
- **Blueprint grid / hero glow / radar rings** — pure CSS gradients + bordered circles.
- **No heavy image assets.** The old 440 KB base64 PNG wordmark was removed and replaced by a themed inline SVG bridge mark.

**Grouped color system (homepage-only, 2026-05-29):** each dashboard group uses one accent family — **Field Operations** teal/green-blue (`card-icon-teal`/`tag-teal`, green, `card-icon-cyan`/`tag-cyan`), **Documentation** purple/indigo (`card-icon-purple`/`tag-violet`, indigo), **Time & Admin** gold (`card-icon-gold`/`tag-gold`), **Coming Soon** muted (`.grp-soon .card-icon` forces neutral). The Continue panel's `ICLASS` map mirrors these so recent-tool cards match their group. This intentionally diverges from per-tool brand colors (see CLAUDE.md §4) until Phase 2 — do not revert it as a "fix".

**Content rules:**
- **Continue** uses real existing local data only (`ft_last`, `ft_dc144_recent`, `wo_recent`, `ft_ts_entries`), read-only, **no new storage keys, no fabricated recent activity**. Empty → graceful message + clearly labeled "Open" shortcuts.
- **No fake links.** Resources with no destination render as disabled `.util-soon` placeholders; Coming Soon tools stay disabled `.is-soon` cards with no `href`.
- **Search** reuses `#tool-filter` / `.tool-card` / `#tools-empty` — no "no results" before typing.
- **Tool card structure:** Active tool cards use icon + title together in `.card-top` (`display:flex; align-items:center; gap:10px`). `.card-desc` and `.card-foot` follow as separate flex children of the card. `.card-foot` groups tags on the left; `.card-arrow` pins right via `margin-left:auto`. The RECENT pill prepends to `.card-foot` without displacing the arrow.

**Animation safety** (same as Overlay & Toast Rules): final keyframes end `transform: none`; never put `transform`/`contain: layout`/`will-change`/`filter`/`perspective` on `body`/`html`/main shell; fixed overlays must resolve to the viewport.

---

## One-off style exceptions (documented)

| Page | Class | Reason not in field-ui.css |
|---|---|---|
| `index.html` | command-center visuals (`.hero-*`, `.nj-*`, `.hero-bridge`, `.tool-card` glass, `.continue-*`, `.util-*`) | Homepage-only command-center identity + local light/dark token overrides; not reused by tool pages |
| `njsearch.html` | `.btn-primary` | Slightly different padding/gap from ft-btn; bridge-specific hover variants |
| `njfuel.html` | `.btn-primary` | Uses `:not(:disabled):hover` to handle disabled locate button |
| `timesheet.html` | `.hub-back` | Uses local CSS vars `var(--gold)` for consistency with bottom-nav gold palette |
| `dc144.html` | `.btn-export` | Green `#166534` specific to Excel export action |
| `dc144.html` | `.dc-modal-*` | Predates ft-modal-* system; renaming would require JS changes |
| `njsearch.html` / `njfuel.html` | `.guide-overlay` / `.guide-modal` | Predates ft-modal-* system; identical across both pages but renaming requires JS changes in both |

---

## Group icon color rules

Homepage section icons, homepage tool card icons, Continue/recent icons, and individual tool-page main/hero/header icons must use group-based colors. Do not use random accent colors within a group.

| Group | Color | Tools |
|---|---|---|
| Field Operations | teal/green (`card-icon-teal`) | Bridge Navigator, Fuel Finder, Milepost Finder |
| Documentation | purple/indigo (`card-icon-purple`) | Work Order Closeout, DC-144 Field Form |
| Time & Admin | amber/gold (`card-icon-gold`) | Payroll Calculator |
| Coming Soon | muted (overridden by `.grp-soon .card-icon`) | Drainage Finder, Emergency Assistance |

**Scope:** icon color alignment only. Do not broadly recolor controls, toggles, buttons, status dots, map styles, form sections, card borders, or page backgrounds to match icon colors.

---

## Topbar safety rules

**No permanent `will-change`:** Never set `will-change: transform` permanently on `#topbar`/`.topbar`/`.ft-topbar`. The shared `field-ui.css` rule sets only `transition` — no `will-change`. Permanent `will-change` on a sticky element creates a GPU compositing stacking context that clips child content on mobile.

**No absolute title centering with action buttons:** Do not use `position:absolute; left:50%; transform:translateX(-50%)` to center a tool-page topbar title when the topbar contains right-side action buttons — they overlap at desktop widths. Use flex static layout instead.

---

## Map dark mode backing

In `html[data-dark]`, map containers need an explicit dark navy background (e.g. `background: #0c1a30`) to avoid pale/white rounded-corner halos where transparent areas show through. Apply on the outer container (`#map` or `.map-panel`), not on Leaflet internals. Do not alter tile behavior or disable tiles to work around this.

---

## Blueprint grid + dense UI surfaces

Dense UI areas — calendars, pay-period summaries, data tables, dense form sections — need an opaque or near-opaque panel surface when the blueprint grid background is active. Wrap the area in a container with a solid background token (light: `var(--surface-2)`; dark: hardcoded `#0d1c38`) rather than removing the page grid globally. Grid lines must not bleed behind calendar weekday rows, pill labels, or data cells.
