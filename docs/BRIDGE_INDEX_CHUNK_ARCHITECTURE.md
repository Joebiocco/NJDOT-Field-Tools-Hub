# Bridge index and county-chunk architecture

This document describes the current as-built Bridge Navigator data and
runtime. It replaces the old future/proposed wording. Read it with
docs/protected-areas.md before changing Bridge search, chunks, map rendering,
bookmarks, or service-worker assets.

## Contents

- [Current architecture](#current-architecture)
- [File layout](#file-layout)
- [Index schema](#index-schema)
- [County chunk schema](#county-chunk-schema)
- [Runtime flow](#runtime-flow)
- [Map rendering contract](#map-rendering-contract)
- [Selection and detail](#selection-and-detail)
- [Bookmarks, GPS, share, and copy](#bookmarks-gps-share-and-copy)
- [Caching and transitions](#caching-and-transitions)
- [Validation and regression](#validation-and-regression)
- [Safe future changes](#safe-future-changes)

## Current architecture

Bridge Navigator uses a lightweight statewide index for startup/search/map
metadata and full records split into county chunks. The index currently
contains 6,823 records, schemaVersion 1, generatedDate 2026-05-20, and source
Derived from data/njstructures.json. Full records are not embedded in the
page.

The page uses one canvas for all bridge point rendering, a spatial/grid hit
test, and Leaflet for basemap, map motion, selected bubble, and map controls.
This combination keeps thousands of points responsive without creating
thousands of DOM markers.

## File layout

- data/bridges/index.json — metadata plus statewide lightweight records.
- data/bridges/chunks/by-county/<COUNTY>.json — one full-record chunk per
  county code.
- data/njstructures.json — source/raw structure data; do not load the raw
  file directly in the browser.
- pages/njsearch.html — search, chunk loading, rendering, selection, map,
  bookmarks, GPS, share/copy, and transition behavior.
- tools/validate-bridge-data.js — schema/count/relationship checks.
- service-worker.js — deliberate index/page precache; cache changes require a
  protected release decision.

The index record chunkPath is a relative path to the corresponding county
chunk. County chunk metadata records schemaVersion, county, countyCode,
recordCount, generatedDate, and source.

## Index schema

Top-level shape:

    {
      "metadata": {
        "schemaVersion": 1,
        "recordCount": 6823,
        "generatedDate": "YYYY-MM-DD",
        "source": "Derived from data/njstructures.json",
        "chunkStrategy": "by-county"
      },
      "records": []
    }

Index records contain:

- Structure_Number — raw compatibility identifier.
- structureNumberDisplay — user-facing normalized identifier.
- structureNumberSearch — normalized search variants.
- searchText — prebuilt uppercase/searchable text.
- Structure_Name, County, County_Code, countyCode, Municipality.
- Route_Number, Facility_Carried, Features_Intersected.
- Milepoint, Latitude, Longitude, Structure_Length_(ft).
- chunkPath — full-record lookup path.

Do not remove or rename raw fields; page code and bookmarks depend on the
structure number relationship. Add derived fields only with validator and
runtime review.

## County chunk schema

Top-level shape:

    {
      "metadata": {
        "schemaVersion": 1,
        "county": "Atlantic",
        "countyCode": "ATLANTIC",
        "recordCount": 207,
        "generatedDate": "YYYY-MM-DD",
        "source": "Derived from data/njstructures.json"
      },
      "records": []
    }

Chunk records keep full source fields, including condition, inspection,
clearance, lanes, spans, widths, owner, maintenance, dates, costs, roadway
type, and the lightweight fields needed to merge with the index. The exact
raw keys are validated by tools/validate-bridge-data.js; do not hand-edit one
county to fix a source-wide problem.

## Runtime flow

### Startup

1. Load the page and the lightweight index.
2. Build the in-memory searchable record list and structure-number map.
3. Initialize Leaflet and the canvas layer.
4. Show an intentional loading/empty/error state if an index or map source
   is unavailable.

### Search

- Normalize user input and search against the index's prebuilt fields.
- Return all relevant matches; no arbitrary “first 50”/“Show 50” cap.
- Partial matches remain a result list. Do not collapse or select the first
  match automatically.
- Empty, malformed, and no-match queries have concise next-step copy.

### Chunk loading

- On actual selection, use the index record's chunkPath/county code.
- Cache a loaded chunk in memory for the current page session.
- De-duplicate concurrent requests for the same county.
- If a chunk fails, keep the selected lightweight information visible and
  provide a retry/error state rather than throwing away the entire page.

### Detail

Merge index metadata with the full chunk record by the normalized raw
Structure_Number. Render field labels in stable groups. Do not display
undefined, NaN, or raw implementation keys as if they were user-facing data.

## Map rendering contract

- One canvas point layer renders all indexed points.
- Canvas edges are buffered so a point is not cut off during pan/inertia.
- The canvas redraws after resize, move, zoom, zoom animation, and final
  movement. Use requestAnimationFrame to coalesce redraws.
- A spatial/grid hit test finds the nearest rendered point without creating
  one DOM marker per bridge.
- The selected bridge is raised/colored distinctly in the canvas or selected
  Leaflet treatment, but never receives duplicate competing markers.
- The canvas remains separate from Leaflet's interactive controls; pointer
  handling must not block map gestures.
- A selected bridge centers the map and keeps the result/detail card
  synchronized with the map bubble.
- Mobile map dock controls must not hide details or the page's primary action.

When changing canvas math, test zooming, panning, inertial movement, resize,
device-pixel-ratio, selected state, and mobile dock collapse/expand.

## Selection and detail

- Search results, active selection, map state, detail panel, and browser
  history/share state must agree.
- Selecting a real result collapses search only after the data/detail state
  is ready.
- Change bridge reopens search without losing the current page shell.
- Result count and visible list describe the complete available index.
- Detail fields preserve raw structure identifiers for copy/bookmark/share
  compatibility while using the formatted display value in headings.

## Bookmarks, GPS, share, and copy

Preserve localStorage key ft_bridge_bookmarks and its current record shape.
Bookmark create/remove/reload must work without a full chunk being loaded
first. A saved bookmark can reload its lightweight record and then fetch the
full county chunk.

Find My Bridge uses the current geolocation permission states, a nearest
search, map centering, and retry/fallback copy. It must not alter stored
bookmarks or silently select a random result.

Share/copy should use the current page's supported API/clipboard fallback and
provide a visible confirmation. Shared structure identifiers and links must
remain stable.

## Caching and transitions

The page is HTML network-first through the service worker and can use local
data/cache fallback. Do not add county chunks to the service-worker precache
individually without measuring the cache budget and a release plan.

Hub/tool navigation must settle at opacity 1 and transform none. bfcache
restoration, reduced motion, and transition timeout fallback must remove
stale classes/inline styles. Fixed map docks, overlays, and toasts use
viewport/dvh/safe-area sizing.

## Validation and regression

Run:

- node tools/validate-bridge-data.js;
- a page script parse/load check;
- index startup and offline/cache fallback;
- exact/partial/empty/no-result search;
- no-cap all-record availability;
- actual selection, change-selection, detail, chunk error/retry;
- map pan/zoom/zoom animation/resize and selected-state marker uniqueness;
- bookmarks, share/copy, and Find My Bridge;
- 390px and 1440px light/dark visual pass;
- hub → Bridge → hub transition pass.

If the source data or generator changes, compare metadata record counts,
county counts, chunkPath reachability, normalized structure numbers, and
representative full-record fields before opening the page.

## Safe future changes

Use a schema version only when the runtime and validator can handle both the
old and new shape during transition. Do not migrate all raw fields into the
lightweight index simply because a detail screen needs one field; add a
derived field with a measured startup/cache cost or read it from the chunk.

Any future spatial index, vector tile, or worker optimization must preserve:

- all-record discoverability;
- normalized structure/bookmark compatibility;
- conservative selection and no auto-select on partial search;
- one visual selected state;
- chunk error recovery;
- offline/network behavior;
- current page links and share state.
