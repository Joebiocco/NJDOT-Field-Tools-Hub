// Authoritative numbered-road geometry lookup for pages/emergency.html.
// The generated data is based on the NJDOT NJ Roadway Network File.  This
// module never guesses from the nearest milepost point: it matches the GPS
// fix to a route centerline and can abstain when the accuracy area reaches a
// competing route family.
(function (global) {
  'use strict';

  var routeSubtypes = {
    '1': 'Interstate',
    '2': 'US Route',
    '3': 'NJ State Highway',
    '4': 'Authority / Parkway / Expressway',
    '5': '500 Series County Route',
    '6': '600 / 700 Series County Route'
  };
  var stateSet = { '1': 1, '2': 1, '3': 1, '4': 1 };
  var countySet = { '5': 1, '6': 1 };
  var METERS_PER_DEGREE = 111320;
  var SEARCH_RADIUS_M = 2000;
  var MATCH_RULES = {
    maxGpsAccuracyM: 120,
    // Fixed slop beyond the GPS accuracy circle: real pavement width (multi-
    // lane divided highways can be 20m+ from centerline to shoulder) plus
    // minor source-data digitization error.
    centerlineBufferM: 30,
    competingClearanceM: 5,
    minFamilySeparationM: 25
  };

  function fetchJsonWithFallback(paths) {
    var index = 0;
    function next() {
      if (index >= paths.length) return Promise.reject(new Error('all roadway fetch attempts failed'));
      var path = paths[index++];
      return fetch(path, { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('http ' + response.status);
        return response.json();
      }).catch(function () { return next(); });
    }
    return next();
  }

  function subtypeFamily(subtype) {
    var value = String(subtype || '');
    if (stateSet[value]) return 'state';
    if (countySet[value]) return 'county';
    return null;
  }

  function routePriority(subtype) {
    var value = String(subtype || '');
    return value === '1' ? 1 : value === '2' ? 2 : value === '3' ? 3 : value === '4' ? 4 : 5;
  }

  function decodePath(encoded, scale) {
    var path = [];
    if (!encoded || encoded.length < 4) return path;
    var lat = Number(encoded[0]);
    var lon = Number(encoded[1]);
    path.push(lat / scale, lon / scale);
    for (var i = 2; i + 1 < encoded.length; i += 2) {
      lat += Number(encoded[i]);
      lon += Number(encoded[i + 1]);
      path.push(lat / scale, lon / scale);
    }
    return path;
  }

  function decodeMeasures(encoded, scale) {
    if (!encoded || !encoded.length) return null;
    var values = [];
    var measure = 0;
    for (var i = 0; i < encoded.length; i++) {
      measure += Number(encoded[i]);
      values.push(measure / scale);
    }
    return values;
  }

  function nearestOnPath(path, measures, lat, lon) {
    if (!path || path.length < 4) return null;
    var cosLat = Math.cos(lat * Math.PI / 180);
    var bestDistance = Infinity;
    var bestLat = null;
    var bestLon = null;
    var bestAlong = 0;
    var bestMeasure = null;
    var totalLength = 0;
    var previousLat = path[0];
    var previousLon = path[1];

    for (var i = 2; i < path.length; i += 2) {
      var currentLat = path[i];
      var currentLon = path[i + 1];
      var ax = (previousLon - lon) * cosLat * METERS_PER_DEGREE;
      var ay = (previousLat - lat) * METERS_PER_DEGREE;
      var bx = (currentLon - lon) * cosLat * METERS_PER_DEGREE;
      var by = (currentLat - lat) * METERS_PER_DEGREE;
      var vx = bx - ax;
      var vy = by - ay;
      var length = Math.sqrt(vx * vx + vy * vy);
      var lengthSquared = length * length;
      var fraction = lengthSquared ? Math.max(0, Math.min(1, (-ax * vx - ay * vy) / lengthSquared)) : 0;
      var px = ax + fraction * vx;
      var py = ay + fraction * vy;
      var distance = Math.sqrt(px * px + py * py);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestLat = previousLat + fraction * (currentLat - previousLat);
        bestLon = previousLon + fraction * (currentLon - previousLon);
        bestAlong = totalLength + fraction * length;
        if (measures && measures.length === path.length / 2) {
          var previousMeasure = Number(measures[i / 2 - 1]);
          var currentMeasure = Number(measures[i / 2]);
          if (isFinite(previousMeasure) && isFinite(currentMeasure)) bestMeasure = previousMeasure + fraction * (currentMeasure - previousMeasure);
        }
      }
      totalLength += length;
      previousLat = currentLat;
      previousLon = currentLon;
    }
    return {
      distanceM: bestDistance,
      matchLat: bestLat,
      matchLon: bestLon,
      fraction: totalLength ? bestAlong / totalLength : 0,
      measure: bestMeasure
    };
  }

  function directionLabel(value) {
    var text = String(value || '').toUpperCase();
    if (text.indexOf('SOUTH TO NORTH') >= 0) return 'Northbound';
    if (text.indexOf('NORTH TO SOUTH') >= 0) return 'Southbound';
    if (text.indexOf('WEST TO EAST') >= 0) return 'Eastbound';
    if (text.indexOf('EAST TO WEST') >= 0) return 'Westbound';
    return '';
  }

  function canonicalRouteKey(sri, parentSri) {
    // NJDOT PARENT_SRI is already the authoritative signed-route identity.
    // Keep the complete value: suffixes distinguish real routes such as Spur
    // 1 vs. Spur 2 and County 13B I vs. County 13B II.  Truncating it can
    // merge those routes and defeat the classifier's competing-route safety
    // check.  Associated carriageways carry the same PARENT_SRI, so using the
    // complete parent still groups them with the route they belong to.
    return String(parentSri || sri || '').trim();
  }

  function candidateFromSegment(segment, match) {
    var subtype = String(segment[1]);
    var family = subtypeFamily(subtype);
    var mpStart = Number(segment[5]);
    var mpEnd = Number(segment[6]);
    var mp = isFinite(Number(match.measure)) ? Number(match.measure) : mpStart + (mpEnd - mpStart) * match.fraction;
    var sri = String(segment[2] || '');
    var parentSri = String(segment[11] || sri);
    var canonicalName = String(segment[13] || segment[3] || segment[4] || 'Unknown Route');
    var canonicalRoadNumber = String(segment[14] || segment[4] || '');
    return {
      id: segment[0],
      family: family,
      subtype: subtype,
      routeClass: routeSubtypes[subtype] || 'Numbered Route',
      sri: sri,
      parentSri: parentSri,
      routeKey: canonicalRouteKey(sri, parentSri),
      name: canonicalName,
      segmentName: String(segment[3] || segment[4] || 'Unknown Route'),
      roadNumber: canonicalRoadNumber,
      segmentRole: String(segment[12] || (parentSri === sri ? 'primary' : 'associated-carriageway')),
      direction: directionLabel(segment[7]),
      distanceM: match.distanceM,
      matchLat: match.matchLat,
      matchLon: match.matchLon,
      mp: Math.round(mp * 100) / 100,
      mpStart: mpStart,
      mpEnd: mpEnd,
      source: 'NJDOT NJ Roadway Network File'
    };
  }

  function isNearBounds(bounds, lat, lon, radiusM) {
    if (!bounds || bounds.length < 4) return true;
    var latRadius = radiusM / METERS_PER_DEGREE;
    var lonRadius = radiusM / (METERS_PER_DEGREE * Math.max(0.2, Math.cos(lat * Math.PI / 180)));
    var qMinLat = Math.round((lat - latRadius) * 1000000);
    var qMaxLat = Math.round((lat + latRadius) * 1000000);
    var qMinLon = Math.round((lon - lonRadius) * 1000000);
    var qMaxLon = Math.round((lon + lonRadius) * 1000000);
    return bounds[2] >= qMinLat && bounds[0] <= qMaxLat && bounds[3] >= qMinLon && bounds[1] <= qMaxLon;
  }

  function createLookup() {
    var index = null;
    var chunkCache = {};

    function loadIndex() {
      if (index) return Promise.resolve(index);
      var paths = ['../data/roadways/index.json'];
      if (location.protocol === 'file:') {
        paths.push('http://127.0.0.1:8765/data/roadways/index.json');
        paths.push('http://localhost:8765/data/roadways/index.json');
      }
      return fetchJsonWithFallback(paths).then(function (json) {
        index = json;
        return index;
      });
    }

    function loadChunk(tile) {
      if (chunkCache[tile]) return Promise.resolve(chunkCache[tile]);
      var meta = index && index.tiles ? index.tiles[tile] : null;
      if (!meta) return Promise.resolve([]);
      var paths = ['../' + meta.file];
      if (location.protocol === 'file:') {
        paths.push('http://127.0.0.1:8765/' + meta.file);
        paths.push('http://localhost:8765/' + meta.file);
      }
      return fetchJsonWithFallback(paths).then(function (json) {
        var segments = json.segments || [];
        chunkCache[tile] = segments;
        return segments;
      });
    }

    function neighborTiles(lat, lon, radius) {
      var tileSize = Number(index && index.tileSizeDeg) || 0.1;
      var baseLat = Math.floor(lat / tileSize);
      var baseLon = Math.floor(lon / tileSize);
      var result = [];
      for (var latOffset = -radius; latOffset <= radius; latOffset++) {
        for (var lonOffset = -radius; lonOffset <= radius; lonOffset++) {
          result.push((baseLat + latOffset) + '_' + (baseLon + lonOffset));
        }
      }
      return result;
    }

    function findMatch(lat, lon, accuracyMeters) {
      return loadIndex().then(function () {
        var keys = neighborTiles(lat, lon, 1).filter(function (key) { return !!index.tiles[key]; });
        return Promise.all(keys.map(loadChunk)).then(function (sets) {
          var seen = {};
          var candidates = { state: [], county: [] };
          var scale = Number(index.coordinateScale) || 1000000;
          var searchRadius = Math.max(SEARCH_RADIUS_M, Number(accuracyMeters) || 0);

          for (var setIndex = 0; setIndex < sets.length; setIndex++) {
            var segments = sets[setIndex];
            for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
              var segment = segments[segmentIndex];
              var id = String(segment[0]);
              if (seen[id]) continue;
              seen[id] = true;
              var family = subtypeFamily(segment[1]);
              if (!family || !isNearBounds(segment[8], lat, lon, searchRadius)) continue;
              if (!segment._decodedPath) segment._decodedPath = decodePath(segment[9], scale);
              if (!segment._decodedMeasures) segment._decodedMeasures = decodeMeasures(segment[10], Number(index.measureScale) || 100000);
              var match = nearestOnPath(segment._decodedPath, segment._decodedMeasures, lat, lon);
              if (!match || !isFinite(match.distanceM)) continue;
              var candidate = candidateFromSegment(segment, match);
              var familyCandidates = candidates[family];
              var sameRoute = null;
              for (var candidateIndex = 0; candidateIndex < familyCandidates.length; candidateIndex++) {
                if (familyCandidates[candidateIndex].routeKey === candidate.routeKey) {
                  sameRoute = familyCandidates[candidateIndex];
                  break;
                }
              }
              if (!sameRoute) {
                familyCandidates.push(candidate);
              } else if (candidate.distanceM < sameRoute.distanceM - 0.5 ||
                         (Math.abs(candidate.distanceM - sameRoute.distanceM) <= 0.5 && routePriority(candidate.subtype) < routePriority(sameRoute.subtype))) {
                familyCandidates[candidateIndex] = candidate;
              }
            }
          }

          function sortCandidates(items) {
            items.sort(function (a, b) {
              if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
              return routePriority(a.subtype) - routePriority(b.subtype);
            });
            // Keep every route candidate.  The classifier must see a distant
            // signed route if it falls inside the reported GPS uncertainty;
            // truncating this list could hide a competing route at a complex
            // interchange and create false confidence.
            return items;
          }
          var stateCandidates = sortCandidates(candidates.state);
          var countyCandidates = sortCandidates(candidates.county);

          return {
            complete: true,
            source: index.source + ' (' + index.sourceRelease + ')',
            loadedTiles: keys,
            state: { best: stateCandidates[0] || null, candidates: stateCandidates },
            county: { best: countyCandidates[0] || null, candidates: countyCandidates }
          };
        });
      });
    }

    return { findMatch: findMatch };
  }

  function candidateDistance(candidate) {
    if (!candidate) return Infinity;
    var distance = Number(candidate.distanceM);
    return isFinite(distance) && distance >= 0 ? distance : Infinity;
  }

  function classifyRouteType(match, accuracyMeters, isFresh) {
    var labels = { state: 'State / US / Interstate', county: 'County Route' };
    var accuracy = Number(accuracyMeters);
    var stateCandidate = match && match.state && match.state.best;
    var countyCandidate = match && match.county && match.county.best;
    var stateDistance = candidateDistance(stateCandidate);
    var countyDistance = candidateDistance(countyCandidate);
    var base = {
      route: null,
      accuracy: isFinite(accuracy) ? accuracy : null,
      stateDistance: isFinite(stateDistance) ? stateDistance : null,
      countyDistance: isFinite(countyDistance) ? countyDistance : null,
      stateCandidate: stateCandidate || null,
      countyCandidate: countyCandidate || null,
      source: match && match.source ? match.source : null
    };

    if (isFresh === false) {
      base.status = 'stale';
      base.label = 'Route type not checked';
      base.reason = 'stale-gps';
      return base;
    }
    if (isFresh !== true) {
      base.status = 'insufficient';
      base.label = 'Route type cannot be determined';
      base.reason = 'no-fix';
      return base;
    }
    if (!match || match.complete !== true) {
      base.status = 'insufficient';
      base.label = 'Authoritative route data is unavailable';
      base.reason = 'roadway-data-unavailable';
      return base;
    }
    if (!isFinite(accuracy) || accuracy <= 0) {
      base.status = 'uncertain';
      base.label = 'GPS accuracy is unavailable';
      base.reason = 'accuracy-unavailable';
      return base;
    }
    if (accuracy > MATCH_RULES.maxGpsAccuracyM) {
      base.status = 'uncertain';
      base.label = 'GPS accuracy is too broad to choose safely';
      base.reason = 'accuracy-too-low';
      return base;
    }

    var winner = stateDistance <= countyDistance ? 'state' : 'county';
    var winnerCandidate = winner === 'state' ? stateCandidate : countyCandidate;
    var winnerDistance = winner === 'state' ? stateDistance : countyDistance;
    var otherDistance = winner === 'state' ? countyDistance : stateDistance;
    var winningFamily = match[winner] || {};
    var winningCandidates = winningFamily.candidates || (winnerCandidate ? [winnerCandidate] : []);
    var matchRadius = accuracy + MATCH_RULES.centerlineBufferM;
    var competitorLimit = accuracy + MATCH_RULES.competingClearanceM;
    base.winnerDistance = isFinite(winnerDistance) ? winnerDistance : null;
    base.otherDistance = isFinite(otherDistance) ? otherDistance : null;
    base.matchRadius = matchRadius;
    base.competitorLimit = competitorLimit;
    base.gap = isFinite(otherDistance) ? otherDistance - winnerDistance : Infinity;
    base.routeCandidate = winnerCandidate || null;

    if (!winnerCandidate || winnerDistance > matchRadius) {
      base.status = 'uncertain';
      base.label = 'No numbered-road geometry is close enough';
      base.reason = 'no-route-near-fix';
      return base;
    }
    // A second family inside the GPS uncertainty plus a map-data safety
    // clearance means the fix could legitimately belong to either family.
    if (otherDistance <= competitorLimit) {
      base.status = 'uncertain';
      base.label = 'Competing route families overlap the GPS uncertainty';
      base.reason = 'competing-family-within-uncertainty';
      return base;
    }
    if (base.gap < MATCH_RULES.minFamilySeparationM) {
      base.status = 'uncertain';
      base.label = 'Route families are not separated enough';
      base.reason = 'insufficient-separation';
      return base;
    }

    // A family match is not enough to show a route number.  If another
    // signed route of the winning family is also inside the GPS uncertainty,
    // withhold the route card rather than presenting the nearest one as fact.
    for (var routeIndex = 0; routeIndex < winningCandidates.length; routeIndex++) {
      var alternate = winningCandidates[routeIndex];
      if (alternate.routeKey !== winnerCandidate.routeKey && alternate.distanceM <= competitorLimit) {
        base.status = 'uncertain';
        base.label = 'The route number is not uniquely identified';
        base.reason = 'competing-route-within-uncertainty';
        base.alternateCandidate = alternate;
        return base;
      }
    }

    base.status = 'confirmed';
    base.route = winner;
    base.label = 'Confirmed route type: ' + labels[winner];
    base.reason = 'unique-centerline-match';
    return base;
  }

  var defaultLookup = createLookup();
  global.RoadwayLookup = {
    routeSubtypes: routeSubtypes,
    matchRules: MATCH_RULES,
    subtypeFamily: subtypeFamily,
    canonicalRouteKey: canonicalRouteKey,
    findMatch: defaultLookup.findMatch,
    createLookup: createLookup,
    classifyRouteType: classifyRouteType
  };
})(window);
