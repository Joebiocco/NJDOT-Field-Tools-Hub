// Shared milepost result adapter — used by pages/milemarker.html and pages/emergency.html.
// Production lookups are delegated to the authoritative roadway-centerline matcher;
// this module preserves the existing milepost result shape for both pages.
(function (global) {
  var routeTypes = {
    "1": "Interstate", "2": "US Route", "3": "NJ State Highway",
    "4": "Authority / Parkway / Expressway", "5": "500 Series County Route",
    "6": "600 / 700 Series County Route"
  };
  var stateSet = { "1": 1, "2": 1, "3": 1, "4": 1 };
  var countySet = { "5": 1, "6": 1 };
  function modeAllowsSubtype(mode, sub) {
    var s = String(sub || '');
    if (mode === 'state') return !!stateSet[s];
    if (mode === 'local' || mode === 'county') return !!countySet[s];
    return false;
  }
  function isAuxiliaryRoutePoint(p) {
    var subtype = String(p && p[4] || '');
    var text = String(((p && p[3]) || '') + ' ' + ((p && p[5]) || '')).toUpperCase();
    if (subtype === '8') return true;
    return /\b(RAMP|CONNECTOR|SECONDARY)\b|[_][A-Z0-9]*S\b|[_]S\b/.test(text);
  }

  function toRad(v) { return v * Math.PI / 180; }
  function hav(lat1, lon1, lat2, lon2) {
    var R = 6371000, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function bearingDeg(lat1, lon1, lat2, lon2) {
    var p1 = toRad(lat1), p2 = toRad(lat2), dLon = toRad(lon2 - lon1);
    var y = Math.sin(dLon) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon);
    var b = Math.atan2(y, x) * 180 / Math.PI;
    return (b + 360) % 360;
  }
  function cardinalFromBearing(b) {
    if (b >= 315 || b < 45) return 'Northbound';
    if (b >= 45 && b < 135) return 'Eastbound';
    if (b >= 135 && b < 225) return 'Southbound';
    return 'Westbound';
  }
  function nearestDirFromRoute(best, points) {
    if (best && best._direction) return { label: best._direction };
    var sri = best[3], bestI = -1, bestD = Infinity;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p[3] !== sri) continue;
      var d = hav(best[0], best[1], p[0], p[1]);
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI < 0) return null;
    var a = null, c = null;
    for (var j = bestI - 1; j >= 0; j--) { if (points[j][3] === sri) { a = points[j]; break; } }
    for (var k = bestI + 1; k < points.length; k++) { if (points[k][3] === sri) { c = points[k]; break; } }
    var from = a, to = c;
    if (!from && c) from = points[bestI];
    if (!to && a) to = points[bestI];
    if (!from || !to || (from[0] === to[0] && from[1] === to[1])) return null;
    var b = bearingDeg(from[0], from[1], to[0], to[1]);
    return { bearing: b, label: cardinalFromBearing(b) };
  }

  function cleanSRI(s) {
    return String(s || '').replace(/_+$/g, '');
  }
  function fmtDist(m) {
    var meters = Number(m);
    if (!isFinite(meters) || meters < 0) return "—";
    var feet = meters * 3.28084;
    return feet < 5280 ? Math.round(feet) + " ft" : (meters / 1609.344).toFixed(2) + " mi";
  }

  function routeFamilyForMode(mode) {
    if (mode === 'state') return 'state';
    if (mode === 'local' || mode === 'county') return 'county';
    return null;
  }

  function roadwayPoint(candidate) {
    if (!candidate) return null;
    var point = [candidate.matchLat, candidate.matchLon, candidate.mp, candidate.sri, candidate.subtype, candidate.name, ''];
    point._dist = candidate.distanceM;
    point._roadway = true;
    point._routeClass = candidate.routeClass;
    point._source = candidate.source;
    point._direction = candidate.direction || '';
    point._routeKey = candidate.routeKey || '';
    return point;
  }

  function authoritativeResult(lat, lon, mode, accuracyMeters) {
    if (!global.RoadwayLookup || typeof global.RoadwayLookup.findMatch !== 'function' || typeof global.RoadwayLookup.classifyRouteType !== 'function') {
      return Promise.reject(new Error('authoritative roadway matcher unavailable'));
    }
    return global.RoadwayLookup.findMatch(lat, lon, accuracyMeters).then(function (match) {
      var decision = global.RoadwayLookup.classifyRouteType(match, accuracyMeters, true);
      var wantedFamily = routeFamilyForMode(mode);
      var result = {
        best: null,
        points: [],
        authoritative: true,
        source: match && match.source ? match.source : null,
        decision: decision,
        reason: decision.reason
      };
      if (decision.status === 'confirmed' && decision.routeCandidate && (!wantedFamily || decision.route === wantedFamily)) {
        result.best = roadwayPoint(decision.routeCandidate);
        result.points = [result.best];
      } else if (decision.status === 'confirmed') {
        result.reason = 'different-route-type';
      }
      return result;
    });
  }

  var ROUTE_DECISION_RULES = {
    maxGpsAccuracyM: 120,
    centerlineBufferM: 30,
    competingClearanceM: 5,
    minFamilySeparationM: 25
  };

  function classifyRouteType(match, accuracyMeters, isFresh) {
    if (global.RoadwayLookup && typeof global.RoadwayLookup.classifyRouteType === 'function') {
      return global.RoadwayLookup.classifyRouteType(match, accuracyMeters, isFresh);
    }
    return {
      status: 'insufficient',
      route: null,
      label: 'Authoritative route data is unavailable',
      reason: 'roadway-data-unavailable'
    };
  }

  function createLookup() {
    function findNearest(lat, lon, mode, accuracyMeters) {
      return authoritativeResult(lat, lon, mode, accuracyMeters);
    }

    return { findNearest: findNearest };
  }

  var defaultLookup = createLookup();

  global.MilepostLookup = {
    routeTypes: routeTypes,
    cleanSRI: cleanSRI,
    fmtDist: fmtDist,
    hav: hav,
    bearingDeg: bearingDeg,
    cardinalFromBearing: cardinalFromBearing,
    nearestDirFromRoute: nearestDirFromRoute,
    modeAllowsSubtype: modeAllowsSubtype,
    isAuxiliaryRoutePoint: isAuxiliaryRoutePoint,
    routeDecisionRules: ROUTE_DECISION_RULES,
    classifyRouteType: classifyRouteType,
    findNearest: defaultLookup.findNearest,
    createLookup: createLookup
  };
})(window);
