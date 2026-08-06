# Field Tools Hub UI style guide

This is the canonical visual and interaction language for the entire local
website. It records the design patterns that have repeatedly required repair:
hub/tool transition flashes, inconsistent topbars, weak mobile controls,
cropped map canvases, unsafe fixed overlays, ambiguous route cards, duplicate
alert language, and the legacy payroll page being treated as the design
reference. Read this guide for every UI, layout, styling, accessibility, or
new-page task.

## Contents

- [Authority and design intent](#authority-and-design-intent)
- [Visual foundations](#visual-foundations)
- [Shells and navigation](#shells-and-navigation)
- [Component language](#component-language)
- [Page families and exceptions](#page-families-and-exceptions)
- [Responsive rules](#responsive-rules)
- [State, data, and copy language](#state-data-and-copy-language)
- [Accessibility](#accessibility)
- [Animation and transition safety](#animation-and-transition-safety)
- [Assets and branding](#assets-and-branding)
- [Design preflight](#design-preflight)
- [Anti-patterns](#anti-patterns)

## Authority and design intent

Field Tools Hub is a calm, field-first utility suite. A worker should be
able to recognize the page, understand what is live or saved, perform the
primary action with one hand, and recover safely when GPS, network, map tiles,
or an external feed is unavailable.

The visual tone is structured, credible, compact, and generous where a user
needs to decide. It is not an editorial marketing site. Concept renderings
are references only; the checked-out page and its rendered behavior are the
implementation truth. When a new design conflicts with a protected behavior,
keep the behavior and adapt the presentation.

Shared design rules live in css/field-ui.css. Page-local inline styles are
normal for specialized maps, weather, forms, and the payroll transition. Do
not copy a token into a new page without deciding whether it belongs in the
shared layer or is a documented page-family exception.

## Visual foundations

### Typography

- Primary family: Inter, with system-ui, -apple-system, Arial, sans-serif
  fallbacks. If a page cannot load the web font, metrics must remain usable.
- Use sentence case for labels and actions. Reserve all caps for compact
  metadata, route badges, or small section eyebrows.
- Use a clear type hierarchy: page title, section title, card title, body,
  metadata. Do not make every label bold or uppercase.
- Line height should support scanning: approximately 1.4–1.55 for body copy,
  1.1–1.25 for large titles, and at least 1.25 for compact labels.
- Numeric field data is tabular in spirit. Keep units visible and align
  comparable values. Do not rely on color alone to communicate a number or
  status.

### Shared tool-shell tokens

These are the current css/field-ui.css light tokens. Use the variables rather
than hard-coding replacements in standard tool pages.

| Token | Value | Role |
| --- | --- | --- |
| --bg | #eef0f4 | Standard tool canvas |
| --surface | #ffffff | Cards, panels, dialogs |
| --border | #d1d9e0 | Main edge |
| --border-lo | #e8ecf0 | Low-contrast divider |
| --accent | #1a56db | Primary action/focus link |
| --accent-lo | rgba(26,86,219,.08) | Soft selection surface |
| --red | #dc2626 | Destructive/emergency state |
| --text | #111827 | Primary text |
| --muted | #6b7280 | Supporting text |
| --muted2 | #4b5563 | Stronger secondary text |
| --radius-sm | 5px | Small controls |
| --radius | 8px | Standard cards/inputs |
| --radius-lg | 10px | Larger panels |
| --transition | .14s ease | Small explicit state transitions |

The shared topbar is normally 58px tall, #1e2939, with a subtle gold bottom
edge. The gold back/home pill uses #E5B33B, with #C9971A for the pressed or
hover state. Standard buttons and controls use a minimum 44px target on coarse
pointer devices. Shared dialogs and toasts already include safe-area and
viewport sizing; extend those patterns rather than making a new fixed system.

### Shared dark-mode rules

Tool pages read html[data-dark] from the field_dark_mode preference. The
shared dark values are:

- --bg #0f1117
- --surface #1c1e26
- --border #2d3748
- --border-lo #1f2937
- --text #FEE9A1
- --muted #C9971A
- --muted2 #E5B33B
- --accent-lo rgba(26,86,219,.15)

Dark mode must preserve contrast and hierarchy, not simply invert every
surface. Map tile backings, focus rings, badges, dialogs, and status colors
need explicit dark treatment. Never flash a white page before the theme
pre-paint script runs.

### Homepage command-center tokens

index.html is a distinct command-center family. Its light canvas is
#eaf0f8 with #0f1d36 text, #5a6b85 muted text, #1a56db primary blue,
#0e7fb8 secondary blue, and #b4861a gold. Its surfaces use #ffffff and
#f5f8fc, with 7px, 10px, and 14px radii. The hero uses existing bridge/NJ
art and blueprint/grid treatments; do not add heavy new imagery.

The dark hub uses a deep navy canvas (#040c1a), light text (#e9effb), muted
#93a7c4, blue #3b82f6, cyan #38bdf8, and gold #e5b33b. Keep the hub's
group accents stable:

| Hub group | Accent language |
| --- | --- |
| Field Operations | teal / green-blue |
| Documentation | purple / indigo |
| Time & Admin | gold |
| Coming Soon | muted slate |

These group colors are intentionally different from page-specific map or
weather colors. Individual tool accents must not recolor the hub taxonomy.

### Timesheet transition tokens

The page used for new payroll design work is pages/timesheet-redesign.html,
not the legacy pages/timesheet.html. The redesign uses a paper-like light
canvas #f5f7fb, white cards, ink #10213b/#203553, blue #1a56db, gold
#d99f1f, green #087f68, coral #c7463f, and border #dce4ef. Its larger cards
use an 18px radius and smaller controls use a 12px radius. The desktop
navigation rail is intentionally wider and more spacious than the standard
tool shell; mobile uses a fixed bottom navigation treatment.

Its dark palette is #071326 canvas, #0f213b card, #eef5ff ink, #d4e2f4
secondary ink, #6ba2ff blue, #f2c65b gold, #50d3b0 green, #ff867a coral,
and a low-opacity blue border. Keep the redesign's timeline vocabulary:
commute in, lunch, regular work, overtime, commute home. The visual may
evolve while the shared storage and payroll calculation contract remains
protected. The visible copy should explain that lunch/commute are excluded,
Normal overtime begins after 40 regular worked hours in the workweek, and
exact overtime blocks end before commute home. Summary Sheet is an overview
for copying those exact blocks, not a second calculator. New times use
10-minute steps; the old page is not the visual reference during transition.

## Shells and navigation

### Standard tool shell

- Use the shared topbar in field-ui.css where the page belongs to the
  standard tool family.
- Keep the home/back control, page identity, contextual status, and help
  control in the same logical order.
- Use a restrained navy header and gold action edge. Do not introduce a
  different global header color for one tool.
- The main canvas starts with the correct pre-paint background, not white.
- Standard content is a centered, readable column or a deliberate split
  layout. Do not let a card become an arbitrary full-bleed desktop slab.

### Hub shell

The hub topbar is a command center, not a copy of the tool topbar. Its
desktop navigation order is Home, Field Ops, Documentation, Time & Admin,
Resources, Alerts & Updates. Resources must remain before Alerts & Updates.
On mobile, the navigation may condense visually, but destinations, active
state, and keyboard order remain correct.

Active navigation is based on the destination section's document coordinates,
not just the nearest clicked element. When two panels share a row, pin the
clicked destination through the scroll animation and restore coordinate-based
tracking after the motion ends. Keep aria-current=location synchronized.
Section underlines and highlights must not jump because of a side-by-side
panel.

The hub keeps Coming Soon at the bottom. Utility links are action cards with
section accents, visible hover/focus states, and clear external-link icons.

### Tool-to-hub transitions

The transition must feel like one application. Use an explicit exit/reveal
contract:

1. Set the outgoing page to its transition state.
2. Navigate or reveal the destination.
3. Wait for the animation/transition end, with a guarded timeout fallback.
4. Remove all transition classes and inline styles.
5. Leave opacity 1, transform none, and no active transition state.

Handle bfcache/page-show restoration and stale inline styles. Never leave a
body transform that traps a fixed modal or toast. Respect reduced motion by
skipping or shortening nonessential movement.

## Component language

### Action hierarchy

- Primary: one clear filled blue or gold action for the page's main task.
- Secondary: outlined or low-emphasis action for a related task.
- Tertiary: text/icon action for navigation, refresh, copy, or help.
- Destructive: red only when the action is destructive or emergency-specific;
  pair it with explicit copy.

Do not put two competing primary buttons next to each other. A field user
should know which action commits, shares, calls, searches, or centers the map.
Every button needs a visible disabled/loading state that explains why it
cannot be used.

### Cards, panels, and density

- Use a surface, border, radius, and spacing system consistently within a
  page family.
- Separate sections with spacing and hierarchy before adding more borders.
- Keep dense information scannable with short labels, aligned values, and
  predictable rows.
- Avoid nested white cards on a white card unless the nested surface conveys
  a real state or grouping.
- Do not use large empty gaps to compensate for an uncertain layout. Check
  the actual grid/flex sizing at mobile and desktop widths.

### Forms and inputs

- Labels remain visible; placeholders are not labels.
- Keep input, select, and button heights aligned.
- Provide an error or empty state adjacent to the affected control.
- Validate without erasing user input. Preserve draft data through expected
  local interactions.
- Use clear units and examples for coordinates, minutes, dates, rates, and
  mileposts.

### Modals, drawers, and toasts

- A modal or drawer has an accessible role/name, synchronized aria-hidden,
  visible close action, Escape support where appropriate, and focus handling.
- The backdrop is viewport-fixed with safe-area padding. Its panel is bounded
  by 100dvh, not only vh.
- A drawer must not be hidden visually while exposed to assistive technology.
- Toasts are short, actionable confirmations. Place the shared container
  above fixed navigation and above safe-area insets. Do not make a toast the
  only place an error is explained.
- The payroll redesign uses a higher bottom offset because its mobile bottom
  navigation is fixed. Preserve that offset when changing toast behavior.

### Loading, empty, and failure states

Every data-dependent panel needs intentional states:

- Loading: say what is loading; use a restrained spinner or skeleton.
- Empty: say what the user can do next.
- Offline/network error: distinguish recoverable retry from unavailable
  source.
- Permission blocked: explain how to fix the permission, offer retry, and
  provide a safe non-GPS path where possible.
- Stale data: show the last-known time and do not imply it is live.

Do not reflash or hide the full page on a small alert/feed update. Update the
affected card in place and preserve scroll/focus.

### Map frames

- Map tiles sit inside a page-colored or white surface with deliberate
  border/radius/shadow. Do not introduce a gray box inside a rounded map
  without purpose.
- Keep Leaflet controls reachable and visually integrated.
- Recenter and map-view controls are overlaid only when their hit area stays
  clear of the map key and important content.
- On mobile, map docks may be fixed or collapsible, but the detail/result
  content must remain discoverable first and the dock must not cover it.
- Canvas point layers require a buffered drawing area and a redraw on
  resize/move/zoom end. Do not create a second visual marker for the selected
  point unless the selected state is deliberately distinct.
- A failed map library must not crash a result or GPS workflow if the
  underlying data can still be used.

### Alert and feed cards

511NJ and NWS feeds are separate panels with separate source labels. Use
expand/collapse, full-message access, refresh status, and a clear empty/error
state. NWS severity uses stable meaning:

| Severity | Light accent | Meaning |
| --- | --- | --- |
| Extreme | deep red | Immediate extreme risk |
| Severe | orange | Serious risk |
| Moderate | amber | Meaningful risk |
| Minor | blue | Limited risk |
| Unknown | gray/slate | Source did not provide a known level |

An NWS card should keep affected area, severity, timing, impact, and
recommended action separate. Do not repeat the alert title as a second
headline. Preserve the full official link.

## Page families and exceptions

### Hub: index.html

Use the command-center tokens and group colors. Keep the hero useful, not
decorative only. Continue/search/install/bookmark helpers are utilities, not
competing hero calls to action. Traffic and weather feeds remain full-width
scannable panels below the grouped dashboard. Dark mode and scroll state must
not change the semantic order.

### Standard maps: Bridge and Fuel

Use the standard shell and shared map frame. Bridge search is statewide and
chunked; do not reintroduce arbitrary result caps or duplicate canvas/Leaflet
markers. Partial search must not auto-select the first result. Collapse the
search only after an actual selection, and make Change bridge reopen it.
Keep map, details, bookmarks, share/copy, and GPS actions discoverable.

Fuel uses the same map confidence and bookmark language but keeps its local
station data and navigation behavior. Do not couple the two data schemas.

### Milepost and Emergency

These pages share the roadway/milepost language. Show route family, signed
route identity, milepost, distance, accuracy, and freshness only when
supported. A nearby candidate is not automatically a confirmed route.
Ambiguous, stale, broad-accuracy, excluded-local, ramp, or missing-data
states must abstain or clearly request verification.

Emergency keeps immediate actions prominent: Call 911, share/copy report, and
open in maps. Location states distinguish live GPS, last known, blocked, and
unavailable. Permission warning content must be centered, retryable, and
aria-hidden while closed. The user marker and accuracy circle need clear
visual and text labels.

### Weather

Weather may use a specialized dashboard shell, but the shared typography,
focus, safe-area, and state rules still apply. Keep location controls,
forecast, alerts, and radar timeline distinct. Desktop can use a sidebar/third
radar pane; mobile can stack chips and radar below the details. Preserve:

- NWS as the source of current/forecast/alert data.
- Local time and DST-aware labels.
- Radar time controls with a clear current/observed/forecast distinction.
- Area-specific alert settings saved locally.
- No duplicate map alert toggle or duplicate status/tagline/product control.
- Alert updates that modify cards in place instead of flashing the page.

The static PWA contains a push receiver and notification click handler but no
subscription sender or backend. Do not promise closed-app notification
delivery or claim that battery optimization can be bypassed.

### Forms and exports

DC-144 and Work Order have their own protected presentation details. Use the
shared focus, overlay, error, and mobile rules, but do not flatten their form
or export structure into a generic card system. Read
docs/protected-areas.md first.

### Timesheet

All new payroll UI work targets pages/timesheet-redesign.html. It is a
purposeful workspace with a spacious desktop rail, summary/period/log
navigation, a mobile bottom nav, shift timeline vocabulary, and a clear
calculation breakdown. The legacy pages/timesheet.html remains a compatibility
surface until explicit cutover. Preserve both pages' current data keys and
the calculation rules recorded in protected-areas.md.

## Responsive rules

Design against these widths: 390px, 430px, 768px, 900px, 1024px, 1240px,
and 1440px. At minimum, manually inspect 390px and 1440px for a UI change.

- Mobile is not a shrunken desktop. Reorder for task priority; content before
  secondary maps, details before docks, and primary actions before metadata.
- The page width must never exceed the viewport horizontally. Check
  document scrollWidth against clientWidth.
- Use fluid padding with a small minimum. Do not let a fixed desktop width
  push controls off-screen.
- Segmented controls may wrap or scroll horizontally as a group, never
  create page-level overflow.
- Tables can scroll within a labeled container; do not shrink critical
  numbers into unreadable columns.
- Fixed bottom navigation needs bottom padding in the page and in toast/modal
  offsets. Respect env(safe-area-inset-bottom).
- Map heights should be explicit at each meaningful breakpoint and should
  follow the actual available footprint. Do not leave an old wrapper padding
  around a full map.
- At desktop, split panels need stable minimum widths and a graceful
  single-column fallback before content becomes cramped.

## State, data, and copy language

Use factual, calm copy:

- “Live GPS” means a recent successful fix; include time/accuracy where useful.
- “Last known location” means it may be stale; show when it was captured.
- “Location blocked” means the browser permission must be changed; explain
  the action.
- “No decision” or “Verify route” is safer than inventing a route.
- “Refresh” says what source will be queried and preserves the current view.
- “Saved locally” distinguishes local preferences from server-backed data.

Avoid:

- “Guaranteed” for GPS, routing, weather, or external feed results.
- Silent fallback from live to stale data.
- Vague “Something went wrong” without retry or next step.
- Product-facing NJDOT/agency branding without an approved asset.
- Duplicate titles, duplicate alert status, or repeated control labels.

## Accessibility

- Use semantic headings in order and landmark regions.
- Every icon-only control has an accessible name. Decorative SVGs use
  aria-hidden=true.
- Keep visible focus rings, with gold/blue contrast against light and dark
  surfaces.
- Synchronize aria-expanded, aria-current, aria-pressed, aria-hidden, and
  disabled state with the actual UI.
- Dialogs/drawers close predictably and do not expose hidden content to screen
  readers. Do not rely on opacity alone.
- Touch targets are at least 44px. Do not place tiny map controls adjacent to
  a primary action.
- Color is supplementary. Pair severity, selected, error, and success colors
  with text, shape, or icon.
- Respect prefers-reduced-motion and avoid pulsing as the only indicator.
- Announce asynchronous GPS/feed/alert status changes in a polite live region
  when the user needs to know.
- Ensure keyboard order follows the visual task order, especially in split
  map/details layouts and fixed bottom navigation.

## Animation and transition safety

- Prefer opacity, background-color, border-color, and small explicit
  transforms on local components.
- Never use transition: all.
- Never leave transform, will-change, contain: layout, or filter on body,
  html, or the main shell.
- Final keyframe state must be transform: none. JavaScript transition cleanup
  must remove inline styles/classes after completion and after a timeout
  fallback.
- Fixed overlays must be positioned against the viewport with 100dvh and
  safe-area insets. Body transforms can break this.
- Header hide/reveal must not create a blank strip, push content unexpectedly,
  or fight quick-nav synchronization.
- Smooth scroll must be canceled or simplified for reduced motion.
- Rapid radar/map layer changes must cancel stale requests and remove stale
  layers/animation frames.

## Assets and branding

Reuse existing icons and hero art. Do not add a large raster asset for a UI
problem that CSS or an inline SVG can solve. Existing manifest/file names may
contain NJDOT for compatibility; visible product copy remains Field Tools Hub.
Map/weather source labels may use functional geographic terms.

## Design preflight

Before handing off a UI change:

- [ ] The page family and routed docs were read.
- [ ] Light and dark surfaces, text, borders, focus, and status colors were
      checked.
- [ ] Primary/secondary action hierarchy is obvious.
- [ ] 390px and 1440px show no horizontal overflow or clipped controls.
- [ ] 430px, 768px, and the page's critical breakpoint were checked if layout
      changes.
- [ ] Touch targets are at least 44px and keyboard focus is visible.
- [ ] Dialog/drawer/toast aria state and safe-area offsets are correct.
- [ ] No transition: all or persistent shell transform/will-change/filter/
      contain: layout remains.
- [ ] Hub/tool transition settles at opacity 1 and transform none.
- [ ] Loading, empty, error, stale, and permission states have usable copy.
- [ ] Maps redraw after resize/zoom and do not duplicate selected markers.
- [ ] The final diff does not change protected storage or PWA contracts
      accidentally.

## Anti-patterns

Do not reintroduce:

- A white flash during hub/tool navigation.
- A permanent body transform used as a page animation.
- A fixed overlay sized with only 100vh or missing safe-area padding.
- A map wrapper with unexplained gray/white inset or a cropped canvas edge.
- Auto-selecting the first partial Bridge result.
- A result card that calls a GPS-nearest route definitive without evidence.
- A “Show 50” cap that hides statewide Bridge records.
- Full-page reflash when a single alert/feed item updates.
- Two different payroll designs competing as the current design reference.
- A new one-off global header, toast, modal, or dark-mode writer.
