/*
 * Regression test for the Milepost Finder's authoritative roadway adapter
 * (js/milepost-lookup.js), which wraps js/roadway-lookup.js's findMatch/
 * classifyRouteType for pages/milemarker.html and pages/emergency.html.
 *
 * Two layers:
 *   1. A fixed fixture check against a known US 130 / County Route 528
 *      location (the original regression case this script started as).
 *   2. A seeded-random batch of MilepostLookup.findNearest() calls sampled
 *      from the same roadway centerline data the emergency-route-classifier
 *      test uses, verifying the adapter's family-filtering safety property:
 *      calling findNearest() with mode='state' must never return a county
 *      candidate (and vice versa), and a matching-mode/'auto' result must
 *      always name the exact source route the sampled point sits on.
 *
 * Run from the repository root:
 *   node tools/test-milepost-roadway-adapter.js
 *
 * Optional env overrides:
 *   MILEPOST_TEST_SAMPLE_COUNT (default 100, must be an even integer > 1)
 *   MILEPOST_TEST_SEED (default 0xM17e5eed)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LAT = 40.153287;
const LON = -74.698258;
const ACCURACY = 77;

const SAMPLE_COUNT = Number(process.env.MILEPOST_TEST_SAMPLE_COUNT || 100);
const PER_FAMILY = SAMPLE_COUNT / 2;
const SEED = Number(process.env.MILEPOST_TEST_SEED || 0x517e5eed) >>> 0;
const METERS_PER_DEGREE = 111320;

if (!Number.isInteger(SAMPLE_COUNT) || SAMPLE_COUNT < 2 || SAMPLE_COUNT % 2 !== 0) {
  throw new Error('MILEPOST_TEST_SAMPLE_COUNT must be an even integer greater than 1');
}

const BOM = String.fromCharCode(0xFEFF);
function readJson(file) {
  const text = fs.readFileSync(file, 'utf8');
  return JSON.parse(text.indexOf(BOM) === 0 ? text.slice(1) : text);
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

function loadLookups() {
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
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'roadway-lookup.js'), 'utf8'), context, { filename: 'js/roadway-lookup.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'milepost-lookup.js'), 'utf8'), context, { filename: 'js/milepost-lookup.js' });
  return context.window.MilepostLookup;
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
    accuracy
  };
}

async function runFixtureCheck(lookup) {
  const state = await lookup.findNearest(LAT, LON, 'state', ACCURACY);
  const county = await lookup.findNearest(LAT, LON, 'local', ACCURACY);
  const automatic = await lookup.findNearest(LAT, LON, 'auto', ACCURACY);
  const stateBest = state.best;
  const automaticBest = automatic.best;

  const passed = state.authoritative === true &&
    state.decision.status === 'confirmed' &&
    state.decision.route === 'state' &&
    stateBest && stateBest[5] === 'US 130' &&
    stateBest[2] === 56.64 &&
    county.authoritative === true &&
    !county.best &&
    county.reason === 'different-route-type' &&
    automatic.authoritative === true &&
    automatic.decision.status === 'confirmed' &&
    automatic.decision.route === 'state' &&
    automaticBest && automaticBest[5] === 'US 130' &&
    automaticBest[2] === 56.64;

  return {
    name: 'US 130 / County Route 528 fixture',
    passed,
    details: {
      state: { authoritative: state.authoritative, status: state.decision && state.decision.status, route: state.decision && state.decision.route, name: stateBest && stateBest[5], milepost: stateBest && stateBest[2] },
      county: { authoritative: county.authoritative, best: !!county.best, reason: county.reason },
      automatic: { authoritative: automatic.authoritative, status: automatic.decision && automatic.decision.status, route: automatic.decision && automatic.decision.route, name: automaticBest && automaticBest[5], milepost: automaticBest && automaticBest[2] }
    }
  };
}

async function runRandomBatch(lookup, samples, index, seed) {
  const random = createRandom(seed);
  const cases = [];

  for (const family of ['state', 'county']) {
    const matchingMode = family === 'state' ? 'state' : 'local';
    const opposingMode = family === 'state' ? 'local' : 'state';
    for (let i = 0; i < PER_FAMILY; i++) {
      const source = samples[family][Math.floor(random() * samples[family].length)];
      const sourcePath = decodePath(source[9], index.coordinateScale || 1000000);
      const sourcePoint = pointAlongPath(sourcePath, random());
      const accuracy = 5 + random() * 115;
      const fix = perturb(sourcePoint, accuracy, random);
      const expectedKey = routeKey(source[2], source[11]);

      const matching = await lookup.findNearest(fix.lat, fix.lon, matchingMode, fix.accuracy);
      const opposing = await lookup.findNearest(fix.lat, fix.lon, opposingMode, fix.accuracy);
      const auto = await lookup.findNearest(fix.lat, fix.lon, 'auto', fix.accuracy);

      const modeMismatchLeak = !!opposing.best;
      const matchingRouteMismatch = !!matching.best && matching.best._routeKey !== expectedKey;
      const matchingFamilyMismatch = !!matching.best && matching.decision && matching.decision.route !== family;
      const autoRouteMismatch = !!auto.best && auto.best._routeKey !== expectedKey;
      const autoFamilyMismatch = !!auto.best && auto.decision && auto.decision.route !== family;
      const unsafe = modeMismatchLeak || matchingRouteMismatch || matchingFamilyMismatch || autoRouteMismatch || autoFamilyMismatch;

      cases.push({
        family,
        unsafe,
        modeMismatchLeak,
        matchingRouteMismatch,
        matchingFamilyMismatch,
        autoRouteMismatch,
        autoFamilyMismatch,
        source: { sri: source[2], parentSri: source[11], expectedKey },
        matched: matching.best ? { routeKey: matching.best._routeKey, name: matching.best[5] } : null,
        accuracyM: Number(accuracy.toFixed(2))
      });
    }
  }

  return cases;
}

async function main() {
  const lookup = loadLookups();
  const fixtureCheck = await runFixtureCheck(lookup);

  const index = readJson(path.join(ROOT, 'data', 'roadways', 'index.json'));
  const segments = loadSegments(index);
  const samples = {
    state: segments.filter(segment => routeFamily(segment[1]) === 'state'),
    county: segments.filter(segment => routeFamily(segment[1]) === 'county')
  };

  const cases = await runRandomBatch(lookup, samples, index, SEED);
  const unsafeCases = cases.filter(item => item.unsafe);

  const summary = {
    seed: SEED,
    samples: cases.length,
    safe: cases.length - unsafeCases.length,
    unsafe: unsafeCases.length,
    fixtureCheckPassed: fixtureCheck.passed
  };

  console.log(JSON.stringify({
    summary,
    fixtureCheck,
    unsafeExamples: unsafeCases.slice(0, 12)
  }, null, 2));

  if (!fixtureCheck.passed || unsafeCases.length) process.exitCode = 2;
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
