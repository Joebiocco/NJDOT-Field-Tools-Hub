/*
 * Deterministic safety test for the authoritative emergency route matcher.
 *
 * Each batch samples 250 state-family and 250 county-route centerline
 * segments from the NJDOT roadway index, moves the simulated GPS fix by a
 * random distance inside its reported accuracy circle, and verifies that
 * every confirmed result has both the correct route family and the correct
 * canonical signed-route identity. Abstention is the safe result when the
 * uncertainty area reaches another route.
 *
 * Run from the repository root:
 *   node tools/test-emergency-route-classifier.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_COUNT = Number(process.env.ROUTE_TEST_SAMPLE_COUNT || 500);
const BATCH_COUNT = Number(process.env.ROUTE_TEST_BATCH_COUNT || 10);
const PER_FAMILY = SAMPLE_COUNT / 2;
const SEED = Number(process.env.ROUTE_TEST_SEED || 0x5eed500) >>> 0;
const TILE_SIZE_DEG = 0.1;
const METERS_PER_DEGREE = 111320;

if (!Number.isInteger(SAMPLE_COUNT) || SAMPLE_COUNT < 2 || SAMPLE_COUNT % 2 !== 0) {
  throw new Error('ROUTE_TEST_SAMPLE_COUNT must be an even integer greater than 1');
}
if (!Number.isInteger(BATCH_COUNT) || BATCH_COUNT < 1) {
  throw new Error('ROUTE_TEST_BATCH_COUNT must be a positive integer');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function createRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadLookup() {
  const context = {
    window: {},
    location: { protocol: 'http:' },
    Promise,
    console,
    fetch(url) {
      const file = path.resolve(ROOT, 'pages', String(url));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(readJson(file))
      });
    }
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(ROOT, 'js', 'roadway-lookup.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'js/roadway-lookup.js' });
  return context.window.RoadwayLookup;
}

function routeFamily(subtype) {
  return ['1', '2', '3', '4'].includes(String(subtype)) ? 'state' :
    ['5', '6'].includes(String(subtype)) ? 'county' : null;
}

function routeKey(sri, parentSri) {
  return String(parentSri || sri || '').trim();
}

function loadSegments(index) {
  const byId = new Map();
  for (const meta of Object.values(index.tiles)) {
    const file = path.join(ROOT, meta.file);
    const segments = readJson(file).segments || [];
    for (const segment of segments) {
      if (!byId.has(String(segment[0]))) byId.set(String(segment[0]), segment);
    }
  }
  return [...byId.values()];
}

function decodePath(encoded, scale) {
  if (!encoded || encoded.length < 4) return [];
  const pathPoints = [];
  let lat = Number(encoded[0]);
  let lon = Number(encoded[1]);
  pathPoints.push([lat / scale, lon / scale]);
  for (let i = 2; i + 1 < encoded.length; i += 2) {
    lat += Number(encoded[i]);
    lon += Number(encoded[i + 1]);
    pathPoints.push([lat / scale, lon / scale]);
  }
  return pathPoints;
}

function segmentLengthMeters(a, b, referenceLat) {
  const cosLat = Math.cos(referenceLat * Math.PI / 180);
  const dx = (b[1] - a[1]) * cosLat * METERS_PER_DEGREE;
  const dy = (b[0] - a[0]) * METERS_PER_DEGREE;
  return Math.hypot(dx, dy);
}

function pointAlongPath(points, fraction) {
  if (points.length < 2) return points[0];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const length = segmentLengthMeters(points[i - 1], points[i], points[0][0]);
    lengths.push(length);
    total += length;
  }
  if (!total) return points[0];
  let target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 1; i < points.length; i++) {
    const length = lengths[i - 1];
    if (target <= length || i === points.length - 1) {
      const part = length ? target / length : 0;
      return [
        points[i - 1][0] + part * (points[i][0] - points[i - 1][0]),
        points[i - 1][1] + part * (points[i][1] - points[i - 1][1])
      ];
    }
    target -= length;
  }
  return points[points.length - 1];
}

function perturb(point, accuracy, random) {
  const distance = Math.sqrt(random()) * accuracy;
  const bearing = random() * Math.PI * 2;
  const metersPerDegreeLon = METERS_PER_DEGREE * Math.cos(point[0] * Math.PI / 180);
  return {
    lat: point[0] + (Math.cos(bearing) * distance) / METERS_PER_DEGREE,
    lon: point[1] + (Math.sin(bearing) * distance) / metersPerDegreeLon,
    accuracy,
    offset: distance
  };
}

function describeCandidate(candidate) {
  if (!candidate) return null;
  return {
    route: candidate.name,
    sri: candidate.sri,
    routeKey: candidate.routeKey,
    distanceM: Number(candidate.distanceM.toFixed(2)),
    distanceFt: Math.round(candidate.distanceM * 3.28084),
    milepost: candidate.mp
  };
}

function describeSource(segment) {
  return {
    segmentId: segment[0],
    subtype: String(segment[1]),
    route: segment[13] || segment[3] || segment[4] || segment[2],
    sri: segment[2],
    parentSri: segment[11] || segment[2],
    routeKey: routeKey(segment[2], segment[11])
  };
}

function runEdgeChecks(lookup) {
  function candidate(name, routeKeyValue, distanceM) {
    return { name, routeKey: routeKeyValue, distanceM, subtype: '2', sri: routeKeyValue + '_' };
  }
  const uniqueState = candidate('US 130', 'us130', 6);
  const nearbyCounty = candidate('ROUTE 528', 'co528', 550);
  const cases = [
    {
      name: 'unique state geometry confirms',
      match: { complete: true, state: { best: uniqueState, candidates: [uniqueState] }, county: { best: nearbyCounty, candidates: [nearbyCounty] } },
      accuracy: 77,
      fresh: true,
      status: 'confirmed',
      route: 'state'
    },
    {
      name: 'competing family inside uncertainty abstains',
      match: { complete: true, state: { best: candidate('US 130', 'us130', 6), candidates: [candidate('US 130', 'us130', 6)] }, county: { best: candidate('ROUTE 528', 'co528', 80), candidates: [candidate('ROUTE 528', 'co528', 80)] } },
      accuracy: 77,
      fresh: true,
      status: 'uncertain',
      reason: 'competing-family-within-uncertainty'
    },
    {
      name: 'competing signed route inside uncertainty abstains',
      match: { complete: true, state: { best: candidate('US 130', 'us130', 6), candidates: [candidate('US 130', 'us130', 6), candidate('US 206', 'us206', 80)] }, county: { best: nearbyCounty, candidates: [nearbyCounty] } },
      accuracy: 77,
      fresh: true,
      status: 'uncertain',
      reason: 'competing-route-within-uncertainty'
    },
    {
      name: 'wide accuracy abstains',
      match: { complete: true, state: { best: uniqueState, candidates: [uniqueState] }, county: { best: nearbyCounty, candidates: [nearbyCounty] } },
      accuracy: 121,
      fresh: true,
      status: 'uncertain',
      reason: 'accuracy-too-low'
    },
    {
      name: 'far numbered road does not prove the current road',
      match: { complete: true, state: { best: candidate('US 130', 'us130', 100), candidates: [candidate('US 130', 'us130', 100)] }, county: { best: nearbyCounty, candidates: [nearbyCounty] } },
      accuracy: 10,
      fresh: true,
      status: 'uncertain',
      reason: 'no-route-near-fix'
    },
    {
      name: 'stale fix abstains',
      match: { complete: true, state: { best: uniqueState, candidates: [uniqueState] }, county: { best: nearbyCounty, candidates: [nearbyCounty] } },
      accuracy: 10,
      fresh: false,
      status: 'stale',
      reason: 'stale-gps'
    }
  ];
  return cases.map(test => {
    const decision = lookup.classifyRouteType(test.match, test.accuracy, test.fresh);
    const passed = decision.status === test.status && (!test.route || decision.route === test.route) && (!test.reason || decision.reason === test.reason);
    return { name: test.name, passed, actual: { status: decision.status, route: decision.route, reason: decision.reason } };
  });
}

function runIndexChecks(index, segments) {
  const checks = [];
  const classification = index.routeClassification || {};
  const fields = Array.isArray(index.segmentFields) ? index.segmentFields : [];
  const expectedState = JSON.stringify(['1', '2', '3', '4']);
  const expectedCounty = JSON.stringify(['5', '6']);
  checks.push({
    name: 'index uses the official route subtype family mapping',
    passed: JSON.stringify(classification.stateSubtypes) === expectedState &&
      JSON.stringify(classification.countySubtypes) === expectedCounty
  });
  checks.push({
    name: 'index carries canonical parent-route metadata',
    passed: fields.includes('parentSri') && fields.includes('segmentRole') &&
      fields.includes('canonicalName') && segments.every(segment => segment[11] && segment[13])
  });
  checks.push({
    name: 'index contains only supported numbered-route subtypes',
    passed: segments.every(segment => ['1', '2', '3', '4', '5', '6'].includes(String(segment[1])))
  });
  checks.push({
    name: 'index metadata totals match generated segments',
    passed: Number(index.totalSegments) === segments.length &&
      Number(index.totalTileEntries) >= segments.length
  });
  return checks;
}

function makeTargetCheck(name, passed, details) {
  return { name, passed: !!passed, details: details || null };
}

async function runTargetedChecks(lookup, index, segments) {
  const checks = [];

  const screenshotMatch = await lookup.findMatch(40.153287, -74.698258, 77);
  const screenshotDecision = lookup.classifyRouteType(screenshotMatch, 77, true);
  checks.push(makeTargetCheck(
    'US 130 wins over the distant County Route 528 at the reported fix',
    screenshotDecision.status === 'confirmed' &&
      screenshotDecision.route === 'state' &&
      screenshotDecision.stateCandidate &&
      screenshotDecision.stateCandidate.name === 'US 130' &&
      Number(screenshotDecision.stateDistance) < Number(screenshotDecision.countyDistance),
    {
      status: screenshotDecision.status,
      route: screenshotDecision.route,
      stateDistanceM: screenshotDecision.stateDistance,
      countyDistanceM: screenshotDecision.countyDistance,
      stateName: screenshotDecision.stateCandidate && screenshotDecision.stateCandidate.name
    }
  ));

  const namedCounty = segments.find(segment => String(segment[1]) === '6' && segment[3] === 'BARNEGAT AVE');
  if (namedCounty) {
    const countyPath = decodePath(namedCounty[9], index.coordinateScale || 1000000);
    const countyPoint = pointAlongPath(countyPath, 0.5);
    const countyMatch = await lookup.findMatch(countyPoint[0], countyPoint[1], 5);
    const countyDecision = lookup.classifyRouteType(countyMatch, 5, true);
    checks.push(makeTargetCheck(
      'a county route remains county even when its name looks like a street',
      countyDecision.status === 'confirmed' && countyDecision.route === 'county' &&
        countyDecision.countyCandidate && countyDecision.countyCandidate.routeKey === routeKey(namedCounty[2], namedCounty[11]),
      {
        status: countyDecision.status,
        route: countyDecision.route,
        name: countyDecision.countyCandidate && countyDecision.countyCandidate.name,
        routeKey: countyDecision.countyCandidate && countyDecision.countyCandidate.routeKey
      }
    ));
  } else {
    checks.push(makeTargetCheck('the source contains the BARNEGAT AVE county-route regression fixture', false));
  }

  const associated = segments.find(segment => segment[11] && segment[11] !== segment[2]);
  if (associated) {
    const associatedPath = decodePath(associated[9], index.coordinateScale || 1000000);
    const associatedPoint = pointAlongPath(associatedPath, 0.5);
    const associatedMatch = await lookup.findMatch(associatedPoint[0], associatedPoint[1], 5);
    const associatedCandidates = []
      .concat(associatedMatch.state && associatedMatch.state.candidates || [])
      .concat(associatedMatch.county && associatedMatch.county.candidates || []);
    const expectedKey = routeKey(associated[2], associated[11]);
    const sourceCandidates = associatedCandidates.filter(candidate => candidate.sri === associated[2] || candidate.parentSri === associated[11]);
    checks.push(makeTargetCheck(
      'associated carriageways use the parent signed-route identity',
      sourceCandidates.length > 0 && sourceCandidates.every(candidate => candidate.routeKey === expectedKey),
      {
        sourceSri: associated[2],
        parentSri: associated[11],
        expectedKey,
        candidateKeys: sourceCandidates.map(candidate => candidate.routeKey)
      }
    ));
  } else {
    checks.push(makeTargetCheck('the generated index contains associated-carriageway records', false));
  }

  const parentValues = [...new Set(segments.map(segment => String(segment[11] || segment[2] || '').trim()).filter(Boolean))];
  const legacyGroups = new Map();
  for (const parent of parentValues) {
    const legacyKey = parent.length > 9 ? parent.slice(0, 9) : parent;
    if (!legacyGroups.has(legacyKey)) legacyGroups.set(legacyKey, []);
    legacyGroups.get(legacyKey).push(parent);
  }
  const legacyCollisions = [...legacyGroups.values()].filter(group => group.length > 1);
  const canonicalGroups = new Map();
  for (const parent of parentValues) {
    const key = lookup.canonicalRouteKey('', parent);
    if (!canonicalGroups.has(key)) canonicalGroups.set(key, []);
    canonicalGroups.get(key).push(parent);
  }
  const canonicalCollisions = [...canonicalGroups.values()].filter(group => group.length > 1);
  checks.push(makeTargetCheck(
    'distinct PARENT_SRI suffixes remain distinct signed-route identities',
    legacyCollisions.length > 0 && canonicalCollisions.length === 0,
    {
      legacyCollisionExamples: legacyCollisions.slice(0, 4),
      canonicalCollisions
    }
  ));

  return checks;
}

async function runRandomBatch(lookup, samples, index, seed) {
  const random = createRandom(seed);
  const cases = [];

  for (const family of ['state', 'county']) {
    for (let i = 0; i < PER_FAMILY; i++) {
      const source = samples[family][Math.floor(random() * samples[family].length)];
      const sourcePath = decodePath(source[9], index.coordinateScale || 1000000);
      const sourcePoint = pointAlongPath(sourcePath, random());
      const accuracy = 5 + random() * 115;
      const fix = perturb(sourcePoint, accuracy, random);
      const match = await lookup.findMatch(fix.lat, fix.lon, accuracy);
      const decision = lookup.classifyRouteType(match, accuracy, true);
      const confirmedCandidate = decision.route === 'state' ? decision.stateCandidate : decision.countyCandidate;
      const unsafeFamily = decision.status === 'confirmed' && decision.route !== family;
      const unsafeRoute = decision.status === 'confirmed' && (!confirmedCandidate || confirmedCandidate.routeKey !== routeKey(source[2], source[11]));
      const safeConfirmation = decision.status === 'confirmed' && !unsafeFamily && !unsafeRoute;
      cases.push({
        family,
        unsafeFamily,
        unsafeRoute,
        safeConfirmation,
        decision: {
          status: decision.status,
          route: decision.route,
          reason: decision.reason,
          label: decision.label
        },
        source: describeSource(source),
        matched: describeCandidate(confirmedCandidate),
        accuracyM: Number(accuracy.toFixed(2)),
        offsetM: Number(fix.offset.toFixed(2))
      });
    }
  }

  return cases;
}

async function main() {
  const lookup = loadLookup();
  const edgeChecks = runEdgeChecks(lookup);
  const index = readJson(path.join(ROOT, 'data', 'roadways', 'index.json'));
  const segments = loadSegments(index);
  const indexChecks = runIndexChecks(index, segments);
  const targetedChecks = await runTargetedChecks(lookup, index, segments);
  const samples = {
    state: segments.filter(segment => routeFamily(segment[1]) === 'state'),
    county: segments.filter(segment => routeFamily(segment[1]) === 'county')
  };
  let unsafeFamilyCount = 0;
  let unsafeRouteCount = 0;
  let safeConfirmationCount = 0;
  let abstentionCount = 0;
  const unsafeExamples = [];
  const batchSummaries = [];
  for (let batch = 0; batch < BATCH_COUNT; batch++) {
    const batchSeed = (SEED + Math.imul(batch, 0x9e3779b9)) >>> 0;
    const cases = await runRandomBatch(lookup, samples, index, batchSeed);
    const unsafeFamily = cases.filter(item => item.unsafeFamily);
    const unsafeRoute = cases.filter(item => item.unsafeRoute);
    const safeConfirmations = cases.filter(item => item.safeConfirmation);
    const abstentions = cases.length - unsafeFamily.length - unsafeRoute.length - safeConfirmations.length;
    unsafeFamilyCount += unsafeFamily.length;
    unsafeRouteCount += unsafeRoute.length;
    safeConfirmationCount += safeConfirmations.length;
    abstentionCount += abstentions;
    unsafeExamples.push(...unsafeFamily, ...unsafeRoute);
    batchSummaries.push({
      batch: batch + 1,
      seed: batchSeed,
      samples: cases.length,
      safeConfirmations: safeConfirmations.length,
      abstentions,
      unsafeFamilySuggestions: unsafeFamily.length,
      unsafeRouteSuggestions: unsafeRoute.length
    });
  }
  const totalSamples = BATCH_COUNT * SAMPLE_COUNT;
  const allChecks = [...edgeChecks, ...indexChecks, ...targetedChecks];
  const summary = {
    initialSeed: SEED,
    batches: BATCH_COUNT,
    samplesPerBatch: SAMPLE_COUNT,
    totalSamples,
    sourceSamples: { state: PER_FAMILY, county: PER_FAMILY },
    indexedSegments: segments.length,
    safeConfirmations: safeConfirmationCount,
    abstentions: abstentionCount,
    unsafeFamilySuggestions: unsafeFamilyCount,
    unsafeRouteSuggestions: unsafeRouteCount,
    unsafeRate: Number(((unsafeFamilyCount + unsafeRouteCount) / totalSamples).toFixed(4)),
    checksPassed: allChecks.filter(item => item.passed).length,
    checksTotal: allChecks.length,
    note: 'Zero unsafe confirmations in this deterministic sample is evidence for this dataset and model, not proof of physical GPS perfection. The production rule abstains whenever route identity or family separation is not unique.'
  };

  console.log(JSON.stringify({
    summary,
    batchSummaries,
    checks: allChecks,
    unsafeExamples: unsafeExamples.slice(0, 12)
  }, null, 2));
  if (unsafeFamilyCount || unsafeRouteCount || allChecks.some(item => !item.passed)) process.exitCode = 2;
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
