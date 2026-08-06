# Field Tools Hub QA checklist

Use this checklist to prevent the recurring fixes documented in the style
guide. Select the sections that match the change; for protected work, run the
full relevant section. Record failures with page, viewport, state, console
message, and whether the failure is reproducible.

## Contents

- [Before editing](#before-editing)
- [Static and structural checks](#static-and-structural-checks)
- [Visual matrix](#visual-matrix)
- [Cross-page shell and transition checks](#cross-page-shell-and-transition-checks)
- [Accessibility checks](#accessibility-checks)
- [Map and geolocation checks](#map-and-geolocation-checks)
- [Feed, weather, and radar checks](#feed-weather-and-radar-checks)
- [Forms, storage, and exports](#forms-storage-and-exports)
- [DC-144 export and session regression](#dc-144-export-and-session-regression)
- [Payroll transition checks](#payroll-transition-checks)
- [Data and roadway checks](#data-and-roadway-checks)
- [PWA/offline checks](#pwaoffline-checks)
- [Final audit](#final-audit)

## Before editing

- [ ] Read AGENTS.md or CLAUDE.md and docs/INDEX.md.
- [ ] Read the routed design/protected/inventory document.
- [ ] Search with rg for the target selector, function, key, and route.
- [ ] Check git status and identify unrelated user changes.
- [ ] Write the invariant and smallest intended change for protected work.
- [ ] Confirm whether any related Codex chat is still running; do not use its
      unfinished guidance.

## Static and structural checks

- [ ] Relevant inline JavaScript parses or loads without a syntax error.
- [ ] JSON/data files parse and required fields are present.
- [ ] No duplicate IDs were introduced.
- [ ] Every referenced local asset exists.
- [ ] No page-level horizontal overflow is introduced.
- [ ] No accidental transition: all remains.
- [ ] No persistent body/html/shell transform, will-change, filter, or
      contain: layout remains.
- [ ] Key names, IndexedDB names/version/stores, and service-worker assets
      are unchanged unless explicitly in scope.
- [ ] New dialogs/drawers have initial and toggled aria-hidden state.
- [ ] New icon-only buttons have accessible names.
- [ ] Docs links resolve and changed docs have a contents/index section.

## Visual matrix

At minimum use the in-app browser or equivalent local render:

| Width | Check |
| --- | --- |
| 390px | phone layout, fixed nav/toast, overflow, clipped labels, dialogs |
| 430px | larger phone wrapping and map/card width |
| 768px | tablet transition, split/stack behavior |
| 900px | compact desktop/tablet breakpoint |
| 1024px | desktop layout before wide spacing |
| 1240px | wide content/map proportions |
| 1440px | full desktop shell, map, nav, hero, whitespace |

For each relevant width:

- [ ] Light mode.
- [ ] Dark mode.
- [ ] Topbar/back/home/help alignment.
- [ ] Page title and primary action hierarchy.
- [ ] Cards, borders, shadows, radii, and spacing.
- [ ] No horizontal scrollbar or clipped content.
- [ ] Focus state and keyboard order.
- [ ] Loading, empty, error, stale, and success states.
- [ ] Fixed UI does not cover content and respects safe areas.

## Cross-page shell and transition checks

- [ ] Open from the hub and return to the hub.
- [ ] No white flash or stale page opacity.
- [ ] Destination ends at opacity 1 and transform none.
- [ ] Body/html has no leftover inline transition/transform styles.
- [ ] Back/forward cache restore leaves the page usable.
- [ ] Header hide/reveal does not leave a blank strip.
- [ ] Hub active section tracks the destination even when adjacent panels
      share a row.
- [ ] On a fresh index origin, the update summary opens automatically once,
      covers lower install/update banners, closes by button/backdrop/Escape,
      and stays closed after reload without adding a visible trigger bar.
- [ ] Resources remains before Alerts & Updates.
- [ ] Reduced-motion mode skips nonessential scrolling/pulses.
- [ ] A refresh or small feed update does not reflash the full page.

## Accessibility checks

- [ ] Headings and landmarks are semantic and ordered.
- [ ] Tab order follows the task order.
- [ ] All controls have accessible names.
- [ ] aria-current, aria-expanded, aria-pressed, aria-hidden, and disabled
      state match the visual state.
- [ ] Dialog/drawer focus is usable; Escape/close works where expected.
- [ ] Hidden dialog content is not exposed while closed.
- [ ] Focus ring is visible in light and dark modes.
- [ ] Color is not the only severity/selection/error cue.
- [ ] Touch targets are at least 44px.
- [ ] Screen-reader live status is used for important asynchronous GPS/feed
      changes.

## Map and geolocation checks

Apply to Bridge, Fuel, Milepost, Emergency, Weather radar, and any map page:

- [ ] Map loads with normal and delayed network.
- [ ] Map has deliberate border/radius/backing; no unexplained inner gray or
      white frame.
- [ ] Resize, orientation change, pan, zoom, and return-from-hidden redraw
      correctly.
- [ ] Selected marker/point is not duplicated by a second layer.
- [ ] Canvas point layer has buffered edges and redraws after zoom/pan.
- [ ] Map controls remain reachable and do not cover labels/details.
- [ ] Location allowed: live marker, accuracy, time, route/data result.
- [ ] Location denied/blocked: centered explanation, retry, Not now, and
      correct aria-hidden.
- [ ] Location unavailable/stale: clear status and safe fallback.
- [ ] Manual location selection cannot be overwritten by a delayed GPS
      response.
- [ ] A missing Leaflet/map CDN does not crash non-map data or report flows.
- [ ] Mobile map dock/stack does not cover result/detail content.

## Feed, weather, and radar checks

- [ ] 511NJ and NWS panels are visually and semantically separate.
- [ ] Refresh state, source, timestamp, empty state, and error state are
      visible without hiding the rest of the page.
- [ ] Expand/collapse reveals the full relevant message.
- [ ] NWS alert card includes affected area, severity, timing/facts, impact,
      recommended action, and official link without duplicate title.
- [ ] Severity meaning is preserved: Extreme red, Severe orange, Moderate
      amber, Minor blue, Unknown gray.
- [ ] Weather location controls, region chips, and Jump To remain coherent.
- [ ] Manual location wins over delayed automatic location.
- [ ] Forecast labels use local time and DST correctly.
- [ ] Radar default is near current and clearly distinguishes observed/
      forecast mode.
- [ ] Scrub, +/-15 minute, playback, cancel, prefetch, and stale-frame
      cleanup work.
- [ ] Map alert toggle does not trigger an unintended map zoom.
- [ ] Area/type/lead-time/quiet-hour settings save locally and reload.
- [ ] Closed-app push behavior is not represented as guaranteed.

## Forms, storage, and exports

- [ ] Empty/new-user state works with no local storage.
- [ ] Existing records load without data loss.
- [ ] Create/edit/delete/cancel preserve valid draft data.
- [ ] Reload and back/forward preserve the expected local state.
- [ ] Invalid input gives nearby actionable feedback.
- [ ] Dialogs/toasts do not overlap fixed navigation or safe areas.
- [ ] Work Order PDF capture, logo, signatures, photos, and draft restore
      pass if that surface changed.
- [ ] DC-144 signatures, photos, session restore, templates, and exported
      workbook cells pass if that surface changed.
- [ ] No storage key or IndexedDB store was renamed/cleared.

## DC-144 export and session regression

Run this full subsection whenever `pages/dc144.html`, `js/dc144.js`, or
`data/dc144-template.xlsx` changes.

- [ ] Export starts from the official template with the expected a/b/c/d
      sheets and template formatting/logo; no blank-workbook fallback exists.
- [ ] A/B/C/D row limits remain 17/18/18/24. Tab B does not write its
      formula-protected row 33.
- [ ] Representative header, table, date, long-text, and blank cells land in
      their `DC144_CELL_MAP` positions without erasing template borders,
      alignment, merged-cell behavior, or print layout.
- [ ] Autosave persists after its two-second debounce, and Back to Reports
      immediately saves the active `photoKey` session before leaving the
      form. Recent/template limits and old sessions/templates still load.
- [ ] Photo processing cannot leave export permanently pending. A completed
      export has the selected official form and, when photos exist, a
      `Photo Appendix` with each image, caption, and metadata that opens in
      Excel.
- [ ] Signature capture clears to transparent, reloads from a saved session,
      and exports next to the printed inspector name without hiding the
      official underline.
- [ ] Export review keeps blank header fields as warnings but blocks a Tab A
      Custom quantity unit with no typed unit. Verify the download filename
      follows `DC-144-[TAB]-[YYYYMMDD]-[SafeProjectName].xlsx`.
- [ ] The selected form prints fit-to-one-page width, Work Observations begins
      on page two, and unused blank form sheets are absent while an existing
      Photo Appendix remains.

## Payroll checks after redesign cutover

Use pages/timesheet.html as the active visual, interaction, and calculation
target. Keep pages/timesheet-redesign.html as a byte-identical reference copy
until it is intentionally removed.

- [ ] The active route and matching reference copy load with empty and
      representative saved storage.
- [ ] ft_ts_entries, ft_ts_settings, and ft_ts_ppoffset retain their current
      shapes and meaning.
- [ ] New entry, edit, delete, cancel, reload, and period navigation work.
- [ ] Overnight shifts and date boundaries are correct.
- [ ] Lunch/break and commute treatment is correct.
- [ ] Redesign weekly-40 overtime and representative former-legacy entries are
      tested against the active route separately.
- [ ] Biweekly summary and official summary sheet agree with detail.
- [ ] Month/calendar view, 14-day period math, and exact OT blocks are
      correct.
- [ ] Invalid times/minutes preserve the drawer/draft and explain the error.
- [ ] New times use 10-minute increments while existing quarter-hour records
      remain editable without silent rounding.
- [ ] Backup export/import, employee name, settings, and wizard steps work.
- [ ] Redesign desktop rail and mobile bottom navigation work.
- [ ] Toasts/drawers clear the mobile bottom-nav area and safe area.
- [ ] 390px, 430px, and 1440px have no clipping or overflow.
- [ ] The cutover preserves the shared storage keys and the matching reference
      copy remains byte-identical to the active route.
- [ ] The active route's seeded regression remains 44.50 payable / 40.00 regular /
      4.50 overtime with Friday OT 5:00–9:30 AM before commute home.

- [ ] Load tools/timesheet-half-year-seed.json through the backup path and
      verify all 132 entries, 14 covered periods, holiday-only credit, Cash,
      XP, Emergency, overnight, and pay-period carry-over cases.

Additional redesign payroll cases:

- [ ] The redesign uses a fixed Monday-Sunday workweek and keeps a
      Sunday-origin overnight Normal shift in the Sunday-origin week.
- [ ] The 35-hour profile defaults to 7 holiday-credit hours, keeps lunch
      unpaid, and only uses an after-35 threshold when the agreement control is
      enabled; the default remains after 40.
- [ ] Paid/on-duty lunch counts as payable and threshold time; unpaid lunch,
      commute-in, and commute-home are exact deductions and cannot exhaust a
      shift. Negative values are rejected in UI, import, and calculation paths.
- [ ] Cash OT pays exactly 1.5x base pay; XP credits exactly 1.5x worked OT.
      Normal OT, Cash, XP, and Emergency do not build the normal threshold.
- [ ] Emergency entries are rejected before eight qualifying Normal payable
      hours, then use the selected role/code rate snapshot without changing
      when the catalog rate is edited.
- [ ] Official 2026 NJ holidays, custom holidays, holiday-only credit, holiday
      work, and holiday overrides calculate correctly.
- [ ] Regular hours remain in the entry-start pay period while OT/Cash/XP/
      Emergency segments split at midnight and pay-period boundaries; carry
      over is labeled in period views and the Summary Sheet.
- [ ] Full period history works through date navigation, July 25-August 7,
      2026 is one 14-day period, and the 14-day cycle contains 26 periods per
      364-day year.
- [ ] Work-log cards are expanded, calendar days open the complete day view,
      and job number/activity/description remain visible or expandable on
      overview, period, calendar, work log, and Summary Sheet views.
- [ ] Changing redesign rate, profile/threshold, lunch mode, or default
      holiday credit does not change snapshot-backed historical earnings; a new
      entry uses the updated settings.
- [ ] Emergency roles/rates are managed inside Pay rules, remain selectable in
      the entry drawer, and preserve the selected historical rate after catalog
      edits.
- [ ] The current-day leave countdown includes commute-in and unpaid lunch,
      hides after the target or for overnight/history-only cases, and never rolls
      into the next day.
- [ ] The redesign grid is behind content only; animations use explicit
      transitions, have no `transition: all`, and honor reduced motion at 390px,
      430px, and 1440px.

## Data and roadway checks

### Bridge

- [ ] Bridge validator passes for index and county chunks.
- [ ] All indexed records are reachable; no arbitrary display cap.
- [ ] Partial search does not auto-select.
- [ ] Selection, map center, detail, bookmark, share, copy, GPS, and
      change-selection work.

### Roadway/milepost/emergency

- [ ] data/roadways/index.json parses and counts match generated chunks.
- [ ] PARENT_SRI preserves distinct signed routes, including spur/crossing
      cases.
- [ ] Route subtype and role filtering excludes unsafe local/ramp guesses.
- [ ] 5,000 seeded GPS classifier run has zero unsafe route/family
      suggestions and all targeted checks pass.
- [ ] 100 randomized Milepost adapter cases pass.
- [ ] US 130/County Route 528 case, genuine county route, local road,
      ramp/connector, overlap, poor accuracy, and no-data cases are covered.
- [ ] Milepost and emergency page-facing integrations agree.

## PWA/offline checks

- [ ] service-worker.js cache name and asset list are unchanged unless the
      task is an explicit release.
- [ ] HTML network-first and static-asset cache fallback work offline.
- [ ] Missing CDN assets produce contained UI failure states.
- [ ] Manifest name/scope/start URL/theme/icons remain valid.
- [ ] Icon paths resolve.
- [ ] Update/reload message behavior remains safe.
- [ ] Weather notification receiver/click behavior remains intact; no false
      promise of a backend/sender was added.
- [ ] Work Order page fallback behavior is not broken.

## Final audit

- [ ] Inspect git diff with context; no unrelated code or docs were replaced.
- [ ] Run git diff --check.
- [ ] Search for stale names, missing pages, obsolete caps, duplicate titles,
      transition: all, and old routing instructions.
- [ ] Verify every changed document has a navigable Contents section or, for
      the HTML template, a navigable comment index.
- [ ] Verify links to pages/data/docs and all listed storage keys against the
      current tree.
- [ ] Re-run representative browser checks after the final edit.
- [ ] Report verified results, known limitations, and uncommitted state.
