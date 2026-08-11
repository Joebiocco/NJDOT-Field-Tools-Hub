# Field Tools Hub

A static, dependency-free PWA for NJDOT field workers: bridge navigator, fuel
finder, milepost lookup, emergency assistance, weather and radar, a payroll
timesheet tracker, DC-144 field forms, and work order closeout. No build
step, backend, or package dependency — HTML pages contain their own
page-local CSS and JavaScript, plus a handful of shared files.

## Running locally

There is nothing to build or install. Serve the repository root with any
static file server and open it in a browser, for example:

```
npx serve .
```

Then open `http://localhost:3000/index.html` (the Hub). Every tool page
under `pages/` can also be opened directly.

## Deployment

The site is deployed as static files to GitHub Pages. There is no CI/CD
pipeline in this repository; publishing is a matter of committing to the
deployed branch.

## Data and privacy model

This is a **public, static site with no server-side access control**. Do
not treat "Internal Use" labels in the UI as authentication — anyone with
the URL can open it. All user data (timesheet entries, DC-144 drafts and
photos, work order sessions, bookmarks) is stored **only in the browser**
(`localStorage` and `IndexedDB`) on the device that created it. Nothing is
transmitted to a server. Clearing site data/browser storage on that device
permanently deletes it unless the user has exported a backup first — most
tools that hold meaningful local records now include an explicit "Export
backup" / "Import backup" action; use it before clearing browser data or
switching devices. Exported backup files are plain JSON containing whatever
the tool stores (which can include names, project/contract details,
signatures, and photos) — handle exported files with the same care as the
original records.

## Offline behavior

`service-worker.js` precaches the app shell and all tool pages on first
successful visit; the install is rejected (keeping any previously-installed
version) if a core asset fails to cache, so the app never activates in a
half-installed state. Live data — maps, weather/radar, the 511NJ feed —
requires a connection; local records and previously-loaded tool pages work
offline. See `docs/protected-areas.md` for the full PWA/cache contract.

## Repository orientation

Start with `CLAUDE.md` (or `AGENTS.md`) and `docs/INDEX.md` for the full
documentation map, task routing, and protected-surface contracts before
making changes.

## Developer utilities

`tools/` contains data validators and deterministic regression scripts
(`validate-bridge-data.js`, `test-emergency-route-classifier.js`,
`test-milepost-roadway-adapter.js`, `build-roadway-index.py`). Run the
Node scripts with `node tools/<script>.js`; the Python script requires a
local Python 3 install. There is no automated CI gate in this repository —
these scripts are run manually before roadway/milepost/bridge data changes.
