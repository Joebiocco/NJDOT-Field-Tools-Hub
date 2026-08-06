/*
 * Regression test for the Milepost Finder's authoritative roadway adapter.
 *
 * Run from the repository root:
 *   node tools/test-milepost-roadway-adapter.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LAT = 40.153287;
const LON = -74.698258;
const ACCURACY = 77;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
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

async function main() {
  const lookup = loadLookups();
  const state = await lookup.findNearest(LAT, LON, 'state', ACCURACY);
  const county = await lookup.findNearest(LAT, LON, 'local', ACCURACY);
  const automatic = await lookup.findNearest(LAT, LON, 'auto', ACCURACY);
  const stateBest = state.best;
  const automaticBest = automatic.best;

  const output = {
    state: {
      authoritative: state.authoritative,
      status: state.decision && state.decision.status,
      route: state.decision && state.decision.route,
      name: stateBest && stateBest[5],
      milepost: stateBest && stateBest[2],
      distanceFeet: stateBest ? Math.round(stateBest._dist * 3.28084) : null
    },
    county: {
      authoritative: county.authoritative,
      status: county.decision && county.decision.status,
      route: county.decision && county.decision.route,
      best: !!county.best,
      reason: county.reason
    },
    automatic: {
      authoritative: automatic.authoritative,
      status: automatic.decision && automatic.decision.status,
      route: automatic.decision && automatic.decision.route,
      name: automaticBest && automaticBest[5],
      milepost: automaticBest && automaticBest[2],
      distanceFeet: automaticBest ? Math.round(automaticBest._dist * 3.28084) : null
    }
  };
  console.log(JSON.stringify(output, null, 2));

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
  if (!passed) process.exitCode = 2;
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
