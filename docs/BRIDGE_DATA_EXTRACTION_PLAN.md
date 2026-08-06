# Bridge data extraction and migration plan

This document records where Bridge data comes from, what is generated, what
the runtime consumes, and how to make future extraction changes without
recreating the old embedded-payload problems.

## Contents

- [Purpose and current status](#purpose-and-current-status)
- [Source and generated outputs](#source-and-generated-outputs)
- [Current consumers](#current-consumers)
- [Field and identifier rules](#field-and-identifier-rules)
- [Migration history and current boundary](#migration-history-and-current-boundary)
- [Validation plan](#validation-plan)
- [Rollback and compatibility](#rollback-and-compatibility)
- [Manual regression](#manual-regression)
- [Future extraction work](#future-extraction-work)

## Purpose and current status

The original Bridge page carried too much raw data inside a single HTML
payload. The current approach keeps a small statewide search/map index in
data/bridges/index.json and loads complete records from county chunks. The
page currently represents 6,823 records and avoids an arbitrary visible
result cap.

This is an as-built migration record, not permission to replace the current
format. Any future migration must prove startup, search, selection, chunk
loading, bookmarks, map behavior, offline fallback, and share/copy
compatibility before changing the runtime boundary.

## Source and generated outputs

### Source

data/njstructures.json is the source/raw structure dataset. It contains the
full bridge fields and is not a browser payload. Preserve raw values and
identifier spelling through generation.

### Generated statewide index

data/bridges/index.json contains:

- metadata.schemaVersion;
- metadata.recordCount;
- metadata.generatedDate;
- metadata.source;
- metadata.chunkStrategy;
- records with normalized structure identifiers, search text, map
  coordinates, route/county metadata, display fields, and chunkPath.

The current metadata recordCount is 6,823 and schemaVersion is 1.

### Generated county chunks

data/bridges/chunks/by-county/<COUNTY>.json contains metadata plus full
records. Metadata identifies county, countyCode, recordCount, generatedDate,
source, and schemaVersion. A statewide index record's chunkPath must resolve
to exactly one chunk record by raw Structure_Number.

## Current consumers

### all bridge records

pages/njsearch.html loads the lightweight index for statewide search/map
rendering. It must retain all records and should not use a presentation-only
cap.

### Search

Search uses normalized structure number variants and searchable text. It
supports partial query input without selecting the first result. Search
should remain fast in memory; do not make a network request per keystroke.

### Result list

The list uses lightweight fields so a user can compare candidates before
choosing one. It must expose a clear count/empty state and preserve the
selected result through detail/map updates.

### Selection, map, and detail

Selection loads a county chunk on demand, merges the matching full record,
centers the map, and renders the detail/bubble. The map uses one buffered
canvas point layer plus Leaflet; it does not create a DOM marker for every
bridge.

### Bookmarks

ft_bridge_bookmarks stores the existing compatible bookmark shape. A
bookmark should remain useful even when its county chunk is not yet in memory.

### Share and copy

Structure number, display fields, and share links are compatibility outputs.
Copy/share operations must provide confirmation and must not expose raw
undefined fields.

### Find My Bridge

GPS uses the current permission/error/retry states, a nearest candidate
search, map centering, and a clear no-result state. It must not mutate the
bookmark store.

## Field and identifier rules

- Keep raw Structure_Number for lookup and compatibility.
- Keep structureNumberDisplay for human-facing headings.
- Keep structureNumberSearch/searchText for normalized matching.
- Keep countyCode and chunkPath linked to the generated chunk.
- Keep Latitude/Longitude valid numeric map coordinates.
- Preserve source fields in full chunks, including zero, null, dates, and
  condition ratings; do not convert unknown into a misleading zero.
- Do not infer a bridge route or condition from a name when source data is
  missing.

The generator should fail loudly for duplicate raw identifiers, missing
county/chunk relationships, invalid coordinates, invalid JSON, or count
mismatches.

## Migration history and current boundary

The migration boundary is:

1. Raw/source data remains outside the browser payload.
2. A generated index carries only search/map/lookup metadata.
3. Full records are fetched by county chunk after selection.
4. Runtime caches chunks for the current page session.
5. The service worker handles page/index/static fallback; it does not need
   every full chunk precached by default.

Do not move the full data back into pages/njsearch.html. Do not solve a
chunk-loading issue by adding a fixed display cap. Do not change raw
structure-number normalization without a bookmark/shared-link migration plan.

## Validation plan

Before publishing generated data:

- parse every JSON file;
- validate metadata schema/version/source;
- count index records and compare to metadata;
- verify every index chunkPath exists;
- verify each index record resolves to one full-chunk Structure_Number;
- verify county metadata counts and codes;
- detect duplicate raw/display/search identifiers;
- validate finite coordinates and expected numeric types;
- compare representative records against data/njstructures.json;
- run tools/validate-bridge-data.js;
- inspect git diff for accidental giant payloads or unrelated source edits.

After publishing:

- load online and offline;
- search exact/partial/empty/no-result;
- select records from multiple counties;
- force chunk failure and retry;
- verify detail fields, map center, marker uniqueness, copy/share;
- reload bookmarks and Find My Bridge;
- run mobile/desktop visual checks.

## Rollback and compatibility

If generated output is bad, restore the prior generated JSON files as a
coherent set rather than mixing an old index with new chunks. Do not clear
user bookmarks to hide a schema mismatch. If a schema change is unavoidable,
support the old identifier fields and provide an explicit migration/rollback
path.

The service-worker cache/version is a separate protected release decision.
Changing data files does not automatically authorize a version bump.

## Manual regression

### Startup

- [ ] index loads with normal and slow network.
- [ ] no console errors or duplicate point layer.
- [ ] count and empty/loading states are coherent.

### Search and selection

- [ ] exact structure number.
- [ ] formatted/unformatted structure number.
- [ ] partial facility/county query.
- [ ] no-match and empty query.
- [ ] results do not auto-select first partial match.
- [ ] actual selection loads detail and collapses search intentionally.
- [ ] Change bridge reopens search.

### Detail/map

- [ ] map pan/zoom/inertia/resize.
- [ ] selection center and bubble.
- [ ] canvas and Leaflet do not duplicate selection.
- [ ] full fields appear after chunk load.
- [ ] chunk failure has retry and preserves safe context.

### Compatibility

- [ ] bookmark add/remove/reload.
- [ ] share link opens the expected bridge.
- [ ] copy has confirmation.
- [ ] Find My Bridge allowed/denied/unavailable/retry.
- [ ] offline index/page fallback.
- [ ] 390px and 1440px light/dark.

## Future extraction work

Potential improvements include a more compact binary/vector index, a worker
for search, or measured prefetch. Each must be justified against phone
startup, cache size, offline behavior, and field reliability. Preserve the
current file-level contracts until an equivalent validated replacement is
ready.
