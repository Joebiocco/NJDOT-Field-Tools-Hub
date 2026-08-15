/* dc144.js — NJDOT DC-144 Field Form Tool
   Depends on: ExcelJS (CDN), ft_photos IDB (v2), field_dark_mode localStorage
   ========================================================================= */

'use strict';

/* ============================================================
   1. CONSTANTS & CELL MAP
   ============================================================ */

var DC144_RECENT_KEY    = 'ft_dc144_recent';
var DC144_MAX_RECENT    = 25;
var DC144_TEMPLATES_KEY = 'ft_dc144_templates';
var DC144_MAX_TEMPLATES = 100;
var IDB_DB_NAME         = 'ft_photos';
var IDB_DB_VERSION      = 2;
var IDB_WO_STORE        = 'session_photos';
var IDB_DC144_STORE     = 'dc144_sessions';
var TEMPLATE_URL        = '../data/dc144-template.xlsx';

/* Absolute cell coordinates for every writable field.
   All row/col values are 1-based, matching the ExcelJS API. */
var DC144_CELL_MAP = {
  a: {
    header: {
      projectName:   { r: 5,  c: 3 },
      contractId:    { r: 6,  c: 3 },
      contractor:    { r: 7,  c: 3 },
      inspectorName: { r: 9,  c: 6 },
      date:          { r: 9,  c: 14 },
      weatherAMCond: { r: 11, c: 3 },
      weatherAMHigh: { r: 11, c: 4 },
      weatherAMLow:  { r: 11, c: 6 },
      weatherPMCond: { r: 12, c: 3 },
      weatherPMHigh: { r: 12, c: 4 },
      weatherPMLow:  { r: 12, c: 6 }
    },
    payItems: {
      baseRow: 16,
      maxRows: 17,
      cols: {
        itemNo:        1,
        description:   3,
        itemCode:      7,
        planPageNum:   8,
        location:      9,
        subcontractor: 13,
        placedQty:     14,
        asBuiltQty:    15
      }
    },
    remarks: {
      environmental:    { r: 33, c: 1 },
      trafficControl:   { r: 36, c: 1 },
      workObservations: { r: 42, c: 1 }
    },
    workHours: {
      regularCol:  4,
      overtimeCol: 5,
      rows: {
        re:              65,
        nonRESupervisor: 66,
        office:          67,
        general:         68,
        earth:           69,
        drainage:        70,
        aggregates:      71,
        curbSidewalk:    72,
        paving:          73,
        structures:      74,
        utilities:       75,
        electrical:      76,
        guideRail:       77,
        safety:          78,
        miscellaneous:   79,
        benefitLeave:    81,
        training:        82,
        loanedOff:       83
      }
    }
  },
  b: {
    header: {
      projectName:     { r: 5,  c: 3 },
      contractId:      { r: 6,  c: 3 },
      contractor:      { r: 7,  c: 3 },
      itemNumber:      { r: 8,  c: 3 },
      itemDescription: { r: 8,  c: 7 },
      itemCode:        { r: 8,  c: 15 },
      inspectorName:   { r: 10, c: 6 },
      date:            { r: 10, c: 16 }
    },
    hmaPavingRows: {
      baseRow: 15,
      maxRows: 18, // row 19 maps to Excel row 33 (baseRow 15 + rowIndex 18) which is formula-protected and skipped in export
      formulaProtectedRows: [33],
      cols: {
        locationStation: 1,
        lane:            6,
        lift:            7,
        thickness:       8,
        mixNo:           9,
        lotNo:           10,
        poundsReceived:  11,
        poundsPlaced:    13,
        syLaid:          16,
        lbsPerSY:        17
      }
    },
    workObservations: { r: 35, c: 1 },
    temperature: {
      producer: { r: 39, c: 3 },
      mix1: { mixNo: { r: 39, c: 6 }, highestF: { r: 40, c: 7 }, lowestF: { r: 40, c: 8 }, avgF: { r: 40, c: 9 } },
      mix2: { mixNo: { r: 41, c: 6 }, highestF: { r: 41, c: 7 }, lowestF: { r: 41, c: 8 }, avgF: { r: 41, c: 9 } }
    }
  },
  c: {
    header: {
      projectName:     { r: 5,  c: 3 },
      contractId:      { r: 6,  c: 3 },
      contractor:      { r: 7,  c: 3 },
      itemNumber:      { r: 8,  c: 3 },
      itemDescription: { r: 8,  c: 7 },
      itemCode:        { r: 8,  c: 16 },
      inspectorName:   { r: 11, c: 6 },
      date:            { r: 11, c: 17 }
    },
    materialInfo: {
      gradeOfMaterial:  { r: 16, c: 1 },
      producerLocation: { r: 16, c: 6 },
      haulerLocation:   { r: 16, c: 12 }
    },
    applicationRows: {
      baseRow: 20,
      maxRows: 18,
      cols: {
        locationStation:     1,
        lane:                6,
        lotNo:               7,
        tankNo:              8,
        truckNo:             9,
        gaugeStart:          10,
        gaugeFinish:         11,
        tempOfMaterial:      12,
        conversionFactor:    13,
        gallonsAppliedGross: 14,
        gallonsApplied60F:   15,
        areaSY:              16,
        rateGPerSY:          17
      }
    },
    specifiedTempRange:         { r: 36, c: 5 },
    specifiedRateOfApplication: { r: 37, c: 5 },
    workObservations:           { r: 38, c: 5 }
  },
  d: {
    header: {
      projectName:     { r: 5,  c: 3 },
      contractId:      { r: 6,  c: 3 },
      contractor:      { r: 7,  c: 3 },
      itemNumber:      { r: 8,  c: 3 },
      itemDescription: { r: 8,  c: 7 },
      itemCode:        { r: 8,  c: 16 },
      inspectorName:   { r: 10, c: 7 },
      date:            { r: 10, c: 15 }
    },
    pileDescriptor: {
      structure:  { r: 15, c: 1 },
      location:   { r: 15, c: 7 },
      typeHammer: { r: 15, c: 14 }
    },
    pileRows: {
      baseRow: 19,
      maxRows: 24,
      cols: {
        pileNo:            1,
        lengthInLead:      2,
        timberDiaTip:      4,
        timberDiaButt:     5,
        spliceLength:      6,
        spliceFrom:        7,
        penetrationLength: 8,
        blows5ft:          9,
        blows4ft:          10,
        blows3ft:          11,
        blows2ft:          12,
        blows1ft:          13,
        blowsLastInch:     14,
        notes:             15
      }
    },
    workObservations: { r: 41, c: 3 }
  }
};

var TAB_META = {
  a: {
    label: 'DC-144 (a)',
    name:  'Daily Work Report',
    desc:  'General daily work, labor, equipment, and quantities',
    color: '#4338ca',
    colorBg: 'rgba(67,56,202,0.10)',
    sheetName: 'DC-144 (a) Daily Work Report'
  },
  b: {
    label: 'DC-144 (b)',
    name:  'HMA Paving',
    desc:  'Asphalt paving, lifts, lots, tonnage, and temperatures',
    color: '#92400e',
    colorBg: 'rgba(146,64,14,0.10)',
    sheetName: 'DC-144 (b) HMA Supplement'
  },
  c: {
    label: 'DC-144 (c)',
    name:  'Bituminous Materials',
    desc:  'Tack, prime, and surface treatment application',
    color: '#0e7490',
    colorBg: 'rgba(14,116,144,0.10)',
    sheetName: 'DC-144 (c) Bituminous Materials'
  },
  d: {
    label: 'DC-144 (d)',
    name:  'Pile Driving',
    desc:  'Pile logs, blow counts, and driving records',
    color: '#9f1239',
    colorBg: 'rgba(159,18,57,0.10)',
    sheetName: 'DC-144 (d) Pile Driving Suppl.'
  }
};

var WORK_HOURS_CATEGORIES = [
  { key: 're',              label: 'RE',                  excelRow: 65 },
  { key: 'nonRESupervisor', label: 'Non-RE Supervision',  excelRow: 66 },
  { key: 'office',          label: 'Office',              excelRow: 67 },
  { key: 'general',         label: 'General',             excelRow: 68 },
  { key: 'earth',           label: 'Earth',               excelRow: 69 },
  { key: 'drainage',        label: 'Drainage',            excelRow: 70 },
  { key: 'aggregates',      label: 'Aggregates',          excelRow: 71 },
  { key: 'curbSidewalk',    label: 'Curb and Sidewalk',   excelRow: 72 },
  { key: 'paving',          label: 'Paving',              excelRow: 73 },
  { key: 'structures',      label: 'Structures',          excelRow: 74 },
  { key: 'utilities',       label: 'Utilities',           excelRow: 75 },
  { key: 'electrical',      label: 'Electrical',          excelRow: 76 },
  { key: 'guideRail',       label: 'Guide Rail',          excelRow: 77 },
  { key: 'safety',          label: 'Safety',              excelRow: 78 },
  { key: 'miscellaneous',   label: 'Miscellaneous',       excelRow: 79 },
  { key: 'benefitLeave',    label: 'Benefit Leave',       excelRow: 81 },
  { key: 'training',        label: 'Training',            excelRow: 82 },
  { key: 'loanedOff',       label: 'Loaned off Project',  excelRow: 83 }
];

/* ============================================================
   2. APPLICATION STATE
   ============================================================ */

var currentSession      = null;
var currentTab          = null;
var autosaveTimer       = null;
var autosaveStatusTimer = null;
var templateCache       = null;
var photoTargetKey      = null;
var idbConn             = null;
var pendingPhotoOps     = 0; // number of in-flight photo compressions; export waits for 0
var signatureState      = null; // active signature pad state when modal is open

/* ============================================================
   3. INDEXEDDB
   ============================================================ */

function openPhotoDB() {
  if (idbConn) return Promise.resolve(idbConn);
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);
    req.onupgradeneeded = function(event) {
      var db = event.target.result;
      var oldVersion = event.oldVersion;
      if (oldVersion < 1) {
        db.createObjectStore(IDB_WO_STORE);
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(IDB_DC144_STORE)) {
          db.createObjectStore(IDB_DC144_STORE);
        }
      }
    };
    req.onsuccess = function(e) { idbConn = e.target.result; resolve(idbConn); };
    req.onerror   = function(e) { reject(e.target.error); };
  });
}

function dbPutDC144(key, data) {
  return openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(IDB_DC144_STORE, 'readwrite');
      var req = tx.objectStore(IDB_DC144_STORE).put(data, key);
      req.onsuccess = function() { resolve(); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  });
}

function dbGetDC144(key) {
  return openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx  = db.transaction(IDB_DC144_STORE, 'readonly');
      var req = tx.objectStore(IDB_DC144_STORE).get(key);
      req.onsuccess = function(e) { resolve(e.target.result || null); };
      req.onerror   = function(e) { reject(e.target.error); };
    });
  });
}

function dbDeleteDC144(key) {
  if (!key) return Promise.resolve();
  return openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(IDB_DC144_STORE, 'readwrite');
      tx.objectStore(IDB_DC144_STORE).delete(key);
      tx.oncomplete = function() { resolve(); };
      tx.onerror    = function(e) { reject(e.target.error); };
    });
  });
}

// Full-fidelity dump of every saved DC-144 session (each session already
// embeds its own photos/signature as base64, so a plain JSON dump is a
// complete, self-contained backup — no separate photo store to reconcile).
function dbGetAllDC144() {
  return openPhotoDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx    = db.transaction(IDB_DC144_STORE, 'readonly');
      var store = tx.objectStore(IDB_DC144_STORE);
      var keysReq = store.getAllKeys();
      var valsReq = store.getAll();
      var keys, vals;
      keysReq.onsuccess = function() { keys = keysReq.result; if (vals !== undefined) resolve({ keys: keys, values: vals }); };
      valsReq.onsuccess = function() { vals = valsReq.result; if (keys !== undefined) resolve({ keys: keys, values: vals }); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  });
}

/* ============================================================
   4. LOCALSTORAGE — recent sessions list (metadata only)
   ============================================================ */

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(DC144_RECENT_KEY) || '[]'); } catch(e) { return []; }
}

function saveRecent(arr) {
  var slim = arr.slice(0, DC144_MAX_RECENT).map(function(r) {
    return {
      photoKey:      r.photoKey,
      tab:           r.tab,
      projectName:   r.projectName   || '',
      contractId:    r.contractId    || '',
      date:          r.date          || '',
      inspectorName: r.inspectorName || '',
      rowCount:      r.rowCount      || 0,
      photoCount:    r.photoCount    || 0,
      savedAt:       r.savedAt       || new Date().toISOString()
    };
  });
  try { localStorage.setItem(DC144_RECENT_KEY, JSON.stringify(slim)); } catch(e) {}
}

function addToRecent(session) {
  var arr = loadRecent();
  arr = arr.filter(function(r) { return r.photoKey !== session.photoKey; });
  var meta = {
    photoKey:      session.photoKey,
    tab:           session.tab,
    projectName:   (session.header && session.header.projectName)   || 'Untitled Project',
    contractId:    (session.header && session.header.contractId)    || '',
    date:          (session.header && session.header.date)          || '',
    inspectorName: (session.header && session.header.inspectorName) || '',
    rowCount:      getSessionRowCount(session),
    photoCount:    (session.photos && session.photos.length) || 0,
    savedAt:       new Date().toISOString()
  };
  arr.unshift(meta);
  // saveRecent slices to DC144_MAX_RECENT for localStorage; IDB records are never
  // auto-deleted — only explicit user-initiated deleteSession() removes them.
  saveRecent(arr);
}

function getSessionRowCount(session) {
  if (!session || !session.tab) return 0;
  var s = session.section;
  if (!s) return 0;
  if (session.tab === 'a' && s.payItems)        return s.payItems.length;
  if (session.tab === 'b' && s.hmaPavingRows)   return s.hmaPavingRows.length;
  if (session.tab === 'c' && s.applicationRows) return s.applicationRows.length;
  if (session.tab === 'd' && s.pileRows)        return s.pileRows.length;
  return 0;
}

/* ============================================================
   5. SESSION SCHEMA FACTORIES
   ============================================================ */

function createBlankSession(tab) {
  return {
    schemaVersion: 2,
    formId:   'dc144',
    tab:      tab,
    photoKey: 'pk_' + Date.now(),
    savedAt:  new Date().toISOString(),
    header: {
      projectName:   '',
      contractId:    '',
      contractor:    '',
      inspectorName: '',
      date:          todayISO(),
      weatherAMCond: '',
      weatherAMHigh: '',
      weatherAMLow:  '',
      weatherPMCond: '',
      weatherPMHigh: '',
      weatherPMLow:  ''
    },
    inspectorSignature: '', // PNG base64 data URL, drawn via signature pad
    itemHeader: (tab !== 'a') ? { itemNumber: '', description: '', itemCode: '' } : null,
    section:    buildBlankSection(tab),
    photos:     []
  };
}

function buildBlankSection(tab) {
  if (tab === 'a') {
    var wh = {};
    WORK_HOURS_CATEGORIES.forEach(function(cat) { wh[cat.key] = { regular: '', overtime: '' }; });
    return {
      payItems: [],
      remarks:  { environmental: '', trafficControl: '', workObservations: '' },
      workHours: wh
    };
  }
  if (tab === 'b') {
    return {
      hmaPavingRows:    [],
      workObservations: '',
      temperature: {
        producer: '',
        mix1: { mixNo: '', highestF: '', lowestF: '', avgF: '' },
        mix2: { mixNo: '', highestF: '', lowestF: '', avgF: '' }
      }
    };
  }
  if (tab === 'c') {
    return {
      materialInfo:               { gradeOfMaterial: '', producerLocation: '', haulerLocation: '' },
      applicationRows:            [],
      specifiedTempRange:         '',
      specifiedRateOfApplication: '',
      workObservations:           ''
    };
  }
  if (tab === 'd') {
    return {
      pileDescriptor:   { structure: '', location: '', typeHammer: '' },
      pileRows:         [],
      workObservations: ''
    };
  }
  return {};
}

function blankPayItemRow(rowIndex) {
  return {
    rowIndex: rowIndex,
    itemNo: '', description: '', itemCode: '', planPageNum: '',
    location: '', subcontractor: '',
    placedQty: '', placedQtyUnit: 'UNIT', placedQtyUnitCustom: '',
    asBuiltQty: '', asBuiltQtyUnit: 'UNIT', asBuiltQtyUnitCustom: ''
  };
}
function blankHMARow(rowIndex) {
  return { rowIndex: rowIndex, locationStation: '', lane: '', lift: '', thickness: '', mixNo: '', lotNo: '', poundsReceived: '', poundsPlaced: '', syLaid: '', lbsPerSY: '' };
}
function blankApplicationRow(rowIndex) {
  return { rowIndex: rowIndex, locationStation: '', lane: '', lotNo: '', tankNo: '', truckNo: '', gaugeStart: '', gaugeFinish: '', tempOfMaterial: '', conversionFactor: '', gallonsAppliedGross: '', gallonsApplied60F: '', areaSY: '', rateGPerSY: '' };
}
function blankPileRow(rowIndex) {
  return { rowIndex: rowIndex, pileNo: '', lengthInLead: '', timberDiaTip: '', timberDiaButt: '', spliceLength: '', spliceFrom: '', penetrationLength: '', blows5ft: '', blows4ft: '', blows3ft: '', blows2ft: '', blows1ft: '', blowsLastInch: '', notes: '' };
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
}
function pad2(n) { return n < 10 ? '0'+n : String(n); }

/* ============================================================
   6. TOAST
   ============================================================ */

/* ============================================================
   6a. SHARED OVERLAY FOCUS TRAP + OPENER RESTORATION
   Every DC-144 modal/panel is a plain div (role="dialog"), not a native
   <dialog>, so none get focus containment or restoration for free. This
   is an additive layer: call trapFocusOpen(el) right after an overlay
   becomes visible and trapFocusClose(el) right after it is hidden. It
   never changes existing show/hide logic or initial-focus behavior.
   ============================================================ */
var _overlayFocusStack = [];
function trapFocusOpen(overlayEl) {
  if (!overlayEl) return;
  _overlayFocusStack.push({ el: overlayEl, opener: document.activeElement });
}
function trapFocusClose(overlayEl) {
  var idx = -1;
  for (var i = _overlayFocusStack.length - 1; i >= 0; i--) {
    if (_overlayFocusStack[i].el === overlayEl) { idx = i; break; }
  }
  if (idx === -1) return;
  var entry = _overlayFocusStack.splice(idx, 1)[0];
  if (entry.opener && typeof entry.opener.focus === 'function' && document.contains(entry.opener)) {
    try { entry.opener.focus(); } catch (e) {}
  }
}
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Tab' || !_overlayFocusStack.length) return;
  var top = _overlayFocusStack[_overlayFocusStack.length - 1].el;
  if (!top || !top.isConnected) return;
  var nodes = top.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
  var focusable = Array.prototype.filter.call(nodes, function(el) { return el.offsetParent !== null || el === document.activeElement; });
  if (!focusable.length) return;
  var first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function showToast(msg, type, dur) {
  var ct = document.getElementById('toast-ct');
  if (!ct) return;
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'info');
  t.setAttribute('role', type === 'err' ? 'alert' : 'status');
  t.textContent = msg;
  ct.appendChild(t);
  setTimeout(function() {
    t.classList.add('out');
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
  }, dur || 2400);
}

/* ============================================================
   7. AUTO-SAVE & STATUS INDICATOR
   ============================================================ */

function setAutosaveStatus(status) {
  var el = document.getElementById('autosave-status');
  if (!el) return;
  // Photo processing takes priority — don't let autosave clobber the
  // user's signal that photos are still being prepared.
  if (pendingPhotoOps > 0) { updatePhotoPendingIndicator(); return; }
  clearTimeout(autosaveStatusTimer);
  var text = '', color = '';
  if (status === 'saving') {
    text = 'Saving…'; color = 'var(--muted)';
  } else if (status === 'saved') {
    text = 'Draft Saved'; color = '#16a34a';
    autosaveStatusTimer = setTimeout(function() {
      el.textContent = '';
      setMobileStatusPill('', '');
    }, 3000);
  } else if (status === 'error') {
    text = 'Not saved to this device — retry'; color = '#dc2626';
  }
  el.textContent = text;
  el.style.color = color;
  setMobileStatusPill(text, color);
}

function setMobileStatusPill(text, color) {
  var pill = document.getElementById('mobile-status-pill');
  if (!pill) return;
  pill.textContent = text;
  pill.style.color = color || '';
  pill.style.display = text ? '' : 'none';
}

// iOS Safari keeps the layout viewport full-height when the on-screen
// keyboard opens (only visualViewport shrinks), so a plain `bottom: Npx`
// fixed pill can end up hidden behind the keyboard. Nudge it up by the
// keyboard's height when visualViewport reports one. No-op elsewhere.
(function() {
  var pill = document.getElementById('mobile-status-pill');
  if (!pill || !window.visualViewport) return;
  function repositionMobileStatusPill() {
    var vv = window.visualViewport;
    var keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    pill.style.bottom = 'calc(var(--actionbar-h, 120px) + 8px + ' + keyboardOffset + 'px)';
  }
  window.visualViewport.addEventListener('resize', repositionMobileStatusPill);
  window.visualViewport.addEventListener('scroll', repositionMobileStatusPill);
})();

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  setAutosaveStatus('saving');
  autosaveTimer = setTimeout(function() { performAutosave(false); }, 2000);
}

function performAutosave(manual) {
  if (!currentSession || !currentTab) return;
  collectFormData();
  currentSession.savedAt = new Date().toISOString();
  dbPutDC144(currentSession.photoKey, currentSession).then(function() {
    addToRecent(currentSession);
    setAutosaveStatus('saved');
    if (manual) showToast('Draft saved', 'ok', 2000);
  }).catch(function() {
    setAutosaveStatus('');
    showToast('Save failed — storage error', 'err');
  });
}

// Immediate synchronous-feeling save for navigation events (back button, etc.).
// Collects form data and writes to IDB without waiting for the 2-second timer.
// Returns a Promise so callers can chain if needed.
function saveCurrentSessionNow(opts) {
  if (!currentSession || !currentTab) return Promise.resolve();
  collectFormData();
  currentSession.savedAt = new Date().toISOString();
  var silent = !!(opts && opts.silent);
  return dbPutDC144(currentSession.photoKey, currentSession).then(function() {
    addToRecent(currentSession);
    if (!silent) setAutosaveStatus('saved');
  }).catch(function(err) {
    if (!silent) showToast('Save failed — storage error', 'err');
    throw err;
  });
}

/* ============================================================
   8. NAVIGATION
   ============================================================ */

function handleTopbarBack() {
  var formScreen = document.getElementById('form-screen');
  if (formScreen && formScreen.style.display !== 'none') {
    // Inside form — go back to dashboard (no page navigation)
    showDashboard();
  } else {
    // On dashboard — exit back to hub with slide-out animation
    try { sessionStorage.setItem('ft_returning_to_hub', '1'); } catch(_) {}
    document.documentElement.classList.add('exiting-to-hub');
    setTimeout(function() { window.location.href = '../index.html'; }, 300);
  }
}

function playScreenTransition(el, direction) {
  var cls = direction === 'forward' ? 'screen-entering-forward' : 'screen-entering-back';
  el.classList.add(cls);
  setTimeout(function() { el.classList.remove(cls); }, 280);
}

function showDashboard() {
  function goToDashboard() {
    // Close any open modals before changing screens
    closeSignaturePad();
    closeTemplateModal();
    var form = document.getElementById('form-screen');
    var dash = document.getElementById('dashboard-screen');
    form.style.display = 'none';
    dash.style.display = '';
    playScreenTransition(dash, 'back');
    document.getElementById('topbar-title').textContent        = 'DC-144 Field Form';
    document.getElementById('topbar-export-btn').style.display = 'none';
    updateActionbarTop(false);
    if (_progressObserver) { _progressObserver.disconnect(); _progressObserver = null; }
    currentTab     = null;
    currentSession = null;
    renderRecentChips();
    renderTemplateChips();
  }
  // Flush in-flight form data to IDB before clearing state so the 2-second
  // autosave timer cannot cause data loss when the user taps "Back to Reports".
  // Navigation is blocked and currentSession/currentTab are kept until the
  // save is verified, so a failed save can never silently drop in-memory
  // work — saveCurrentSessionNow() already surfaces a "Save failed" toast.
  if (currentSession && currentTab) {
    saveCurrentSessionNow().then(goToDashboard).catch(function() {});
    return;
  }
  goToDashboard();
}

function showForm(tab, session) {
  currentTab     = tab;
  currentSession = session;
  var dash = document.getElementById('dashboard-screen');
  var form = document.getElementById('form-screen');
  dash.style.display = 'none';
  form.style.display = '';
  playScreenTransition(form, 'forward');
  document.getElementById('topbar-title').textContent        = TAB_META[tab].label;
  document.getElementById('topbar-export-btn').style.display = 'none';
  document.getElementById('form-actionbar-title').textContent = TAB_META[tab].label + ' — ' + TAB_META[tab].name;
  setAutosaveStatus('');
  renderForm(tab, session);
  updateActionbarTop(false);
  initFormProgressTracker();
}

/* ============================================================
   9. DASHBOARD RENDERING
   ============================================================ */

function renderDashboard() {
  renderTabCards();
  renderRecentChips();
  renderTemplateChips();
}

function renderTabCards() {
  var grid = document.getElementById('tab-cards-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ['a','b','c','d'].forEach(function(tab) {
    var meta = TAB_META[tab];
    var card = document.createElement('button');
    card.className = 'tab-card';
    card.setAttribute('aria-label', 'Start ' + meta.name);
    card.innerHTML =
      '<span style="position:absolute;left:0;top:0;bottom:0;width:4px;background:' + meta.color + ';border-radius:12px 0 0 12px;" aria-hidden="true"></span>' +
      '<div class="tab-card-top">' +
        '<div class="tab-badge" style="background:' + meta.colorBg + ';color:' + meta.color + ';">' + tab.toUpperCase() + '</div>' +
        '<div class="tab-card-meta">' +
          '<div class="tab-card-label" style="color:' + meta.color + ';">' + meta.label + '</div>' +
          '<div class="tab-card-name">' + meta.name + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tab-card-foot">' +
        '<div class="tab-card-desc">' + meta.desc + '</div>' +
        '<div class="tab-card-arrow">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
        '</div>' +
      '</div>';
    card.addEventListener('click', function() { startNewSession(tab, null); });
    grid.appendChild(card);
  });
}

function renderRecentChips() {
  var container = document.getElementById('recent-chips-container');
  if (!container) return;
  var arr = loadRecent();
  if (!arr.length) {
    container.innerHTML = '<div class="chips-empty">No recent drafts. Start a new report above.</div>';
    return;
  }

  function buildChip(rec) {
    var meta = TAB_META[rec.tab] || TAB_META['a'];
    var chip = document.createElement('div');
    chip.className = 'session-chip';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', 'Resume ' + (rec.projectName || 'Untitled') + ' — ' + rec.tab.toUpperCase());
    var rowLabel   = rec.rowCount  === 1 ? '1 row'   : rec.rowCount  + ' rows';
    var photoLabel = rec.photoCount === 1 ? '1 photo' : rec.photoCount + ' photos';
    var dateLabel  = rec.date ? rec.date : 'No date';
    chip.innerHTML =
      '<div class="session-chip-tab" style="background:' + meta.colorBg + ';color:' + meta.color + ';">' + rec.tab.toUpperCase() + '</div>' +
      '<div class="session-chip-info">' +
        '<div class="session-chip-project">' + esc(rec.projectName || 'Untitled Project') + '</div>' +
        '<div class="session-chip-meta">' + esc(dateLabel) + (rec.contractId ? ' · ' + esc(rec.contractId) : '') + '</div>' +
        '<div class="session-chip-badges">' +
          '<span class="chip-badge">' + esc(meta.label) + '</span>' +
          (rec.rowCount  ? '<span class="chip-badge">' + rowLabel + '</span>'   : '') +
          (rec.photoCount ? '<span class="chip-badge">' + photoLabel + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="session-chip-del" data-key="' + esc(rec.photoKey) + '" aria-label="Delete this draft">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';
    chip.addEventListener('click', function(e) {
      if (e.target.closest('.session-chip-del')) return;
      restoreSession(rec.photoKey, rec.tab);
    });
    chip.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!e.target.classList.contains('session-chip-del')) restoreSession(rec.photoKey, rec.tab);
      }
    });
    chip.querySelector('.session-chip-del').addEventListener('click', function(e) {
      e.stopPropagation();
      deleteSession(rec.photoKey);
    });
    return chip;
  }

  var SHOW_LIMIT = 5;
  var list = document.createElement('div');
  list.className = 'session-chips-list';
  arr.slice(0, SHOW_LIMIT).forEach(function(rec) { list.appendChild(buildChip(rec)); });
  container.innerHTML = '';
  container.appendChild(list);

  if (arr.length > SHOW_LIMIT) {
    var extra = document.createElement('div');
    extra.className = 'session-chips-extra';
    arr.slice(SHOW_LIMIT).forEach(function(rec) { extra.appendChild(buildChip(rec)); });
    container.appendChild(extra);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chips-show-more';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Show all recent (' + arr.length + ')';
    btn.addEventListener('click', function() {
      var open = extra.classList.contains('expanded');
      if (open) {
        extra.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Show all recent (' + arr.length + ')';
      } else {
        extra.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = 'Show less';
      }
    });
    container.appendChild(btn);
  }
}

function startNewSession(tab, tplData) {
  var session = createBlankSession(tab);
  // Pre-populate header fields from template if provided
  if (tplData && tplData.header) {
    Object.keys(tplData.header).forEach(function(k) {
      if (session.header.hasOwnProperty(k)) session.header[k] = tplData.header[k];
    });
  }
  // Apply itemHeader (B/C/D) from template when form types match
  if (tplData && tplData.itemHeader && session.itemHeader && tab !== 'a') {
    Object.keys(tplData.itemHeader).forEach(function(k) {
      if (session.itemHeader.hasOwnProperty(k)) session.itemHeader[k] = tplData.itemHeader[k];
    });
  }
  dbPutDC144(session.photoKey, session).then(function() {
    addToRecent(session);
    showForm(tab, session);
  }).catch(function() {
    // Storage failed to create the initial record — still let the field
    // user work (a blank editor with no way forward is worse in the
    // field), but make the unsaved state impossible to miss so nothing
    // is lost silently. setAutosaveStatus('error') stays visible until a
    // later save (autosave or "Back to Reports") succeeds.
    showToast('Could not save this draft to your device — work is temporary until a save succeeds', 'err', 6000);
    showForm(tab, session);
    setAutosaveStatus('error');
  });
}

function restoreSession(photoKey, tab) {
  dbGetDC144(photoKey).then(function(session) {
    if (!session) { showToast('Draft not found — may have been cleared', 'err'); return; }
    showForm(tab, session);
  }).catch(function() { showToast('Could not load draft', 'err'); });
}

function deleteSession(photoKey) {
  if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
  var arr = loadRecent().filter(function(r) { return r.photoKey !== photoKey; });
  saveRecent(arr);
  renderRecentChips();
  dbDeleteDC144(photoKey).then(function() {
    showToast('Draft deleted', 'info', 1800);
  }).catch(function() {
    showToast('Removed from list, but the on-device record could not be fully deleted', 'err', 4000);
  });
}

/* ============================================================
   10. TEMPLATE SYSTEM
   ============================================================ */

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(DC144_TEMPLATES_KEY) || '[]'); } catch(e) { return []; }
}

function saveTemplatesArr(arr) {
  try { localStorage.setItem(DC144_TEMPLATES_KEY, JSON.stringify(arr.slice(0, DC144_MAX_TEMPLATES))); return true; } catch(e) { return false; }
}

function addTemplate(name, session) {
  var arr = loadTemplates();
  if (arr.length >= DC144_MAX_TEMPLATES) {
    showToast('Template limit reached (' + DC144_MAX_TEMPLATES + '). Delete a template to save a new one.', 'err', 5000);
    return null;
  }
  var entry = {
    id:        'tpl_' + Date.now(),
    name:      name,
    tab:       session.tab,  // save form type so the tab-picker can be skipped
    createdAt: new Date().toISOString(),
    header: {
      projectName:   (session.header && session.header.projectName)   || '',
      contractId:    (session.header && session.header.contractId)    || '',
      contractor:    (session.header && session.header.contractor)    || '',
      inspectorName: (session.header && session.header.inspectorName) || ''
    }
  };
  // Save item header for B/C/D forms so the item number, description, and code
  // are pre-populated when the template is loaded. No photos or signature saved.
  if (session.tab !== 'a' && session.itemHeader) {
    entry.itemHeader = {
      itemNumber:  session.itemHeader.itemNumber  || '',
      description: session.itemHeader.description || '',
      itemCode:    session.itemHeader.itemCode    || ''
    };
  }
  arr.unshift(entry);
  if (!saveTemplatesArr(arr)) {
    showToast('Could not save template — storage is full or unavailable', 'err', 5000);
    return null;
  }
  return entry;
}

function deleteTemplate(id) {
  if (!confirm('Delete this template? This cannot be undone.')) return;
  var arr = loadTemplates().filter(function(t) { return t.id !== id; });
  if (saveTemplatesArr(arr)) {
    renderTemplateChips();
    showToast('Template deleted', 'info', 1800);
  } else {
    showToast('Could not delete template — storage error', 'err', 4000);
  }
}

/* ============================================================
   10b. FULL BACKUP / RESTORE (templates + recent index + all sessions)
   ============================================================ */

var DC144_BACKUP_VERSION = 1;

function exportDC144Backup() {
  dbGetAllDC144().then(function(dump) {
    var sessions = {};
    dump.keys.forEach(function(k, i) { sessions[k] = dump.values[i]; });
    var payload = {
      version: DC144_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      recent: loadRecent(),
      templates: loadTemplates(),
      sessions: sessions
    };
    var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'dc144-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 0);
    showToast('Backup downloaded', 'ok', 2400);
  }).catch(function() {
    showToast('Could not read saved drafts for backup', 'err', 4000);
  });
}

function importDC144Backup(file) {
  if (!file) return;
  if (file.size > 200 * 1024 * 1024) { showToast('Backup file is too large to import', 'err', 5000); return; }
  var reader = new FileReader();
  reader.onload = function() {
    var payload;
    try {
      payload = JSON.parse(reader.result);
      if (!payload || typeof payload !== 'object' || payload.version !== DC144_BACKUP_VERSION) throw new Error('version');
      if (!payload.sessions || typeof payload.sessions !== 'object') throw new Error('shape');
    } catch (e) {
      showToast('Backup could not be imported — invalid or unsupported file', 'err', 5000);
      return;
    }
    if (!confirm('Import this backup? Sessions and templates with matching IDs will be overwritten; everything else stays.')) return;
    openPhotoDB().then(function(db) {
      var keys = Object.keys(payload.sessions);
      var tx = db.transaction(IDB_DC144_STORE, 'readwrite');
      var store = tx.objectStore(IDB_DC144_STORE);
      keys.forEach(function(k) { store.put(payload.sessions[k], k); });
      return new Promise(function(resolve, reject) {
        tx.oncomplete = resolve;
        tx.onerror    = function(e) { reject(e.target.error); };
      });
    }).then(function() {
      if (Array.isArray(payload.recent)) {
        var recentByKey = Object.create(null);
        loadRecent().forEach(function(r) { recentByKey[r.photoKey] = r; });
        payload.recent.forEach(function(r) { if (r && typeof r.photoKey === 'string' && r.photoKey) recentByKey[r.photoKey] = r; });
        saveRecent(Object.keys(recentByKey).map(function(k) { return recentByKey[k]; }));
      }
      if (Array.isArray(payload.templates)) {
        var tplById = Object.create(null);
        loadTemplates().forEach(function(t) { tplById[t.id] = t; });
        payload.templates.forEach(function(t) { if (t && typeof t.id === 'string' && t.id) tplById[t.id] = t; });
        saveTemplatesArr(Object.keys(tplById).map(function(k) { return tplById[k]; }));
      }
      renderRecentChips();
      renderTemplateChips();
      showToast('Backup imported', 'ok', 2400);
    }).catch(function() {
      showToast('Backup import failed partway — some drafts may not have restored', 'err', 5000);
    });
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', function() {
  var exportBtn = document.getElementById('dc144-backup-export-btn');
  var importBtn = document.getElementById('dc144-backup-import-btn');
  var importFile = document.getElementById('dc144-backup-import-file');
  if (exportBtn) exportBtn.addEventListener('click', exportDC144Backup);
  if (importBtn && importFile) importBtn.addEventListener('click', function() { importFile.click(); });
  if (importFile) importFile.addEventListener('change', function() {
    importDC144Backup(importFile.files && importFile.files[0]);
    importFile.value = '';
  });
  if (window.StorageInfoPopover) window.StorageInfoPopover.init();
});

function openTemplateModal() {
  if (!currentSession) return;
  var modal = document.getElementById('template-modal');
  var input = document.getElementById('template-name-input');
  if (!modal) return;
  if (input) {
    input.value = (currentSession.header && currentSession.header.projectName) || '';
    input.style.borderColor = '';
  }
  prepareModalForViewport(modal);
  trapFocusOpen(modal);
  modal.classList.add('open');
  if (input) requestAnimationFrame(function() { input.focus(); input.select(); });
}

function closeTemplateModal() {
  var modal = document.getElementById('template-modal');
  if (modal) { modal.classList.remove('open'); trapFocusClose(modal); }
}

function confirmSaveTemplate() {
  var input = document.getElementById('template-name-input');
  var name  = (input && input.value.trim()) || '';
  if (!name) {
    if (input) { input.focus(); input.style.borderColor = 'var(--red)'; }
    return;
  }
  if (input) input.style.borderColor = '';
  var result = addTemplate(name, currentSession);
  if (result === null) {
    // addTemplate showed a toast explaining the cap; close modal so user can delete
    closeTemplateModal();
    return;
  }
  closeTemplateModal();
  showToast('Template saved: ' + name, 'ok', 2400);
}

function renderTemplateChips() {
  var container = document.getElementById('templates-chips-container');
  if (!container) return;
  var arr = loadTemplates();
  if (!arr.length) {
    container.innerHTML = '<div class="chips-empty" style="padding:16px 0;">No templates yet. Fill in a form header and tap “Save as Template” to create one.</div>';
    return;
  }
  container.innerHTML = '';
  arr.forEach(function(tpl) {
    var chip = document.createElement('div');
    chip.className = 'template-chip';
    chip.style.marginBottom = '8px';
    var dateStr = tpl.createdAt ? tpl.createdAt.slice(0, 10) : '';
    var subLine = [tpl.header.projectName, tpl.header.contractId, dateStr].filter(Boolean).join(' · ');
    var tabBadge = '';
    if (tpl.tab && TAB_META[tpl.tab]) {
      var tm = TAB_META[tpl.tab];
      tabBadge = '<span class="tpl-tab-badge" style="background:' + tm.colorBg + ';color:' + tm.color + ';border:1px solid ' + tm.color + ';">' + tpl.tab.toUpperCase() + ' — ' + tm.name + '</span>';
    }
    chip.innerHTML =
      '<div class="template-chip-icon" aria-hidden="true">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>' +
      '</div>' +
      '<div class="template-chip-info">' +
        '<div class="template-chip-name">' + esc(tpl.name) + (tabBadge ? ' ' + tabBadge : '') + '</div>' +
        (subLine ? '<div class="template-chip-meta">' + esc(subLine) + '</div>' : '') +
      '</div>' +
      '<button class="template-chip-load" aria-label="Load template ' + esc(tpl.name) + '">Load</button>' +
      '<button class="template-chip-del" aria-label="Delete template ' + esc(tpl.name) + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';
    chip.querySelector('.template-chip-load').addEventListener('click', function() {
      showTemplateTabPicker(tpl);
    });
    chip.querySelector('.template-chip-del').addEventListener('click', function() {
      deleteTemplate(tpl.id);
    });
    container.appendChild(chip);
  });
}

function showTemplateTabPicker(tpl) {
  // Templates saved at v1.19+ carry a tab field — skip the picker and load directly.
  // Older templates (no tab field) still show the full tab-picker overlay.
  if (tpl.tab && TAB_META[tpl.tab]) {
    startNewSession(tpl.tab, tpl);
    return;
  }
  var overlay = document.createElement('div');
  overlay.className = 'dc-modal-backdrop';
  overlay.style.zIndex = '8500';
  var box = document.createElement('div');
  box.className = 'dc-modal-box';
  box.style.maxWidth = '360px';
  box.innerHTML =
    '<div class="dc-modal-title">Load Template</div>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:16px;">' + esc(tpl.name) + ' — Select a form type:</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      ['a','b','c','d'].map(function(tab) {
        var m = TAB_META[tab];
        return '<button class="tpl-pick-btn" style="background:' + m.colorBg + ';border:1.5px solid ' + m.color + ';color:' + m.color + ';" data-tab-pick="' + tab + '">' +
          '<span style="font-size:12px;font-weight:700;">' + m.label + '</span><br>' +
          '<span style="font-size:11px;font-weight:500;">' + m.name + '</span>' +
          '</button>';
      }).join('') +
    '</div>' +
    '<div class="dc-modal-actions">' +
      '<button class="btn-secondary" data-cancel>Cancel</button>' +
    '</div>';
  overlay.appendChild(box);
  prepareModalForViewport(overlay);
  overlay.classList.add('open');
  function dismiss() {
    overlay.classList.remove('open');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 160);
  }
  box.querySelectorAll('[data-tab-pick]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      dismiss();
      startNewSession(btn.dataset.tabPick, tpl);
    });
  });
  box.querySelector('[data-cancel]').addEventListener('click', dismiss);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) dismiss(); });
  function onPickerEsc(e) {
    if (e.key === 'Escape') { document.removeEventListener('keydown', onPickerEsc); dismiss(); }
  }
  document.addEventListener('keydown', onPickerEsc);
}

/* ============================================================
   11. FORM RENDERING (master dispatcher)
   ============================================================ */

function renderForm(tab, session) {
  var container = document.getElementById('form-content');
  container.innerHTML = '';
  container.appendChild(renderHeaderSection(tab, session));
  if (tab !== 'a') container.appendChild(renderItemHeaderSection(tab, session));
  if (tab === 'a')      container.appendChild(renderSectionA(session));
  else if (tab === 'b') container.appendChild(renderSectionB(session));
  else if (tab === 'c') container.appendChild(renderSectionC(session));
  else if (tab === 'd') container.appendChild(renderSectionD(session));
  container.appendChild(renderPhotosSection(session));
  wireFormAutosave();
}

/* ── 11a. Header section ──────────────────────────────────── */
function renderHeaderSection(tab, session) {
  var h    = session.header || {};
  var card = makeCard('Header Information',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  );
  var body = card.querySelector('.section-card-body');
  body.innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr 1fr;">' +
      fieldHtml('projectName',   'Project Name',           h.projectName,   'text', 'full-grid-span') +
    '</div>' +
    '<div class="field-group" style="grid-template-columns:1fr 1fr;">' +
      fieldHtml('contractId',    'Contract ID',            h.contractId)   +
      fieldHtml('contractor',    'Contractor',             h.contractor)   +
    '</div>' +
    '<div class="field-group" style="grid-template-columns:1fr 1fr;">' +
      renderInspectorFieldHtml(h, session) +
      fieldHtml('date',          'Date',                   h.date, 'date') +
    '</div>' +
    (tab === 'a' ? renderWeatherHtml(h) : '');
  var projWrap = body.querySelector('[data-field="projectName"]');
  if (projWrap) projWrap.style.gridColumn = '1 / -1';

  // Wire signature trigger button (after innerHTML, the node exists)
  var sigBtn = body.querySelector('#signature-trigger-btn');
  if (sigBtn) {
    sigBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openSignaturePad();
    });
  }
  var sigClear = body.querySelector('#signature-clear-btn');
  if (sigClear) {
    sigClear.addEventListener('click', function(e) {
      e.preventDefault();
      clearSavedSignature();
    });
  }
  return card;
}

function renderInspectorFieldHtml(h, session) {
  var hasSig = !!(session.inspectorSignature);
  var sigPreviewHtml = hasSig
    ? '<img id="signature-preview-img" src="' + esc(session.inspectorSignature) + '" alt="Inspector signature" class="signature-preview-img">'
    : '';
  var sigBtnHtml =
    '<button type="button" id="signature-trigger-btn" class="signature-trigger ' + (hasSig ? 'has-signature' : '') + '" aria-label="' + (hasSig ? 'Edit inspector signature' : 'Add inspector signature') + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>' +
      '<span>' + (hasSig ? 'Edit signature' : 'Add signature') + '</span>' +
    '</button>';
  var sigClearHtml = hasSig
    ? '<button type="button" id="signature-clear-btn" class="signature-clear" aria-label="Remove inspector signature">×</button>'
    : '';
  return '<div data-field="inspectorName" class="inspector-field-wrap">' +
    '<label class="field-label" for="field-inspectorName">Inspector Printed Name</label>' +
    '<input id="field-inspectorName" class="field-input" type="text" ' +
      'data-field="inspectorName" value="' + esc(h.inspectorName || '') + '" ' +
      'placeholder="Inspector Printed Name" aria-label="Inspector Printed Name">' +
    '<div class="signature-row">' +
      sigBtnHtml +
      sigPreviewHtml +
      sigClearHtml +
    '</div>' +
  '</div>';
}

function renderWeatherHtml(h) {
  return '<div style="border-top:1px solid var(--border-lo);margin-top:6px;padding-top:14px;">' +
    '<div style="font-size:12px;font-weight:700;color:var(--muted2);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:12px;">Weather / Temperature</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
      '<div>' +
        '<div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:6px;letter-spacing:0.04em;">AM</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
          fieldHtml('weatherAMCond', 'Condition', h.weatherAMCond) +
          fieldHtml('weatherAMHigh', 'High °F', h.weatherAMHigh, 'number') +
          fieldHtml('weatherAMLow',  'Low °F',  h.weatherAMLow,  'number') +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:6px;letter-spacing:0.04em;">PM</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
          fieldHtml('weatherPMCond', 'Condition', h.weatherPMCond) +
          fieldHtml('weatherPMHigh', 'High °F', h.weatherPMHigh, 'number') +
          fieldHtml('weatherPMLow',  'Low °F',  h.weatherPMLow,  'number') +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ── 11b. Item header section (tabs b/c/d) ──────────────── */
function renderItemHeaderSection(tab, session) {
  var ih   = session.itemHeader || {};
  var card = makeCard('Pay Item Information',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
  );
  var body = card.querySelector('.section-card-body');
  body.innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr 1fr 1fr;">' +
      fieldHtml('ih_itemNumber',  'Item #',      ih.itemNumber)  +
      fieldHtml('ih_description', 'Description', ih.description) +
      fieldHtml('ih_itemCode',    'Item Code',   ih.itemCode)    +
    '</div>';
  return card;
}

/* ============================================================
   12. TAB A — Daily Work Report
   ============================================================ */

function renderSectionA(session) {
  var frag = document.createDocumentFragment();
  var s    = session.section;

  var payCard = makeCard('Pay Items',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
  );
  payCard.querySelector('.section-card-body').style.padding = '0';
  payCard.querySelector('.section-card-body').appendChild(buildDynamicTable('a', s.payItems));
  frag.appendChild(payCard);

  frag.appendChild(renderRemarksCard('Environmental Remarks', 'environmental', s.remarks.environmental, 'a'));
  frag.appendChild(renderRemarksCard('Traffic Control Safety Remarks', 'trafficControl', s.remarks.trafficControl, 'a'));
  frag.appendChild(renderRemarksCard('Work Observations and Remarks', 'workObservations', s.remarks.workObservations, 'a'));

  var hoursCard = makeCard('Work Hours',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  );
  hoursCard.querySelector('.section-card-body').style.padding = '0';
  hoursCard.querySelector('.section-card-body').appendChild(buildWorkHoursTable(s.workHours));
  frag.appendChild(hoursCard);

  var wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  return wrapper;
}

function buildWorkHoursTable(workHours) {
  var table = document.createElement('table');
  table.className = 'hours-table';
  table.innerHTML =
    '<thead><tr>' +
      '<th style="width:60%;">Labor Category</th>' +
      '<th class="num-col">Regular Hrs</th>' +
      '<th class="num-col">Overtime Hrs</th>' +
    '</tr></thead>';
  var tbody = document.createElement('tbody');
  WORK_HOURS_CATEGORIES.forEach(function(cat) {
    var vals = (workHours && workHours[cat.key]) || { regular: '', overtime: '' };
    var tr   = document.createElement('tr');
    tr.innerHTML =
      '<td class="cat-label">' + esc(cat.label) + '</td>' +
      '<td class="num-cell"><input type="number" step="0.25" min="0" class="hours-input" data-wh-key="' + cat.key + '" data-wh-col="regular"  value="' + esc(vals.regular)  + '" placeholder="0" aria-label="' + esc(cat.label) + ' regular hours"></td>' +
      '<td class="num-cell"><input type="number" step="0.25" min="0" class="hours-input" data-wh-key="' + cat.key + '" data-wh-col="overtime" value="' + esc(vals.overtime) + '" placeholder="0" aria-label="' + esc(cat.label) + ' overtime hours"></td>';
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ============================================================
   13. TAB B — HMA Supplement
   ============================================================ */

function renderSectionB(session) {
  var frag = document.createDocumentFragment();
  var s    = session.section;

  var tableCard = makeCard('HMA Paving Log',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>'
  );
  tableCard.querySelector('.section-card-body').style.padding = '0';
  tableCard.querySelector('.section-card-body').appendChild(buildDynamicTable('b', s.hmaPavingRows));
  frag.appendChild(tableCard);

  frag.appendChild(renderRemarksCard('Work Observations and Remarks', 'workObservations', s.workObservations, 'b'));
  frag.appendChild(renderTemperatureBlock(s.temperature));

  var wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  return wrapper;
}

function renderTemperatureBlock(temp) {
  var t    = temp || {};
  var card = makeCard('Mix Temperature',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>'
  );
  var body = card.querySelector('.section-card-body');
  var m1   = t.mix1 || {};
  var m2   = t.mix2 || {};
  body.innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr;margin-bottom:16px;">' +
      fieldHtml('temp_producer', 'Producer of Material', t.producer) +
    '</div>' +
    '<div style="font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Mix 1 Temperatures</div>' +
    '<div class="temp-grid" style="margin-bottom:16px;">' +
      fieldHtml('temp_mix1_mixNo',   'Mix #',      m1.mixNo)              +
      fieldHtml('temp_mix1_highest', 'Highest °F', m1.highestF, 'number') +
      fieldHtml('temp_mix1_lowest',  'Lowest °F',  m1.lowestF,  'number') +
      fieldHtml('temp_mix1_avg',     'Avg °F',     m1.avgF,     'number') +
    '</div>' +
    '<div style="font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Mix 2 Temperatures (if applicable)</div>' +
    '<div class="temp-grid">' +
      fieldHtml('temp_mix2_mixNo',   'Mix #',      m2.mixNo)              +
      fieldHtml('temp_mix2_highest', 'Highest °F', m2.highestF, 'number') +
      fieldHtml('temp_mix2_lowest',  'Lowest °F',  m2.lowestF,  'number') +
      fieldHtml('temp_mix2_avg',     'Avg °F',     m2.avgF,     'number') +
    '</div>';
  return card;
}

/* ============================================================
   14. TAB C — Bituminous Materials
   ============================================================ */

function renderSectionC(session) {
  var frag = document.createDocumentFragment();
  var s    = session.section;

  var matCard  = makeCard('Material Information',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>'
  );
  var mi       = s.materialInfo || {};
  matCard.querySelector('.section-card-body').innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr 1fr 1fr;">' +
      fieldHtml('mi_grade',    'Grade of Material',     mi.gradeOfMaterial)  +
      fieldHtml('mi_producer', 'Producer and Location', mi.producerLocation) +
      fieldHtml('mi_hauler',   'Hauler and Location',   mi.haulerLocation)   +
    '</div>';
  frag.appendChild(matCard);

  var tableCard = makeCard('Application Log',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>'
  );
  tableCard.querySelector('.section-card-body').style.padding = '0';
  tableCard.querySelector('.section-card-body').appendChild(buildDynamicTable('c', s.applicationRows));
  frag.appendChild(tableCard);

  var specCard = makeCard('Specifications',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>'
  );
  specCard.querySelector('.section-card-body').innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr 1fr;">' +
      fieldHtml('spec_tempRange', 'Specified Temperature Range of Material', s.specifiedTempRange)         +
      fieldHtml('spec_rate',      'Specified Rate of Application',           s.specifiedRateOfApplication) +
    '</div>';
  frag.appendChild(specCard);

  frag.appendChild(renderRemarksCard('Work Observations and Remarks', 'workObservations', s.workObservations, 'c'));

  var wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  return wrapper;
}

/* ============================================================
   15. TAB D — Pile Driving Supplement
   ============================================================ */

function renderSectionD(session) {
  var frag = document.createDocumentFragment();
  var s    = session.section;

  var pileInfoCard = makeCard('Pile Descriptor',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
  );
  var pd = s.pileDescriptor || {};
  pileInfoCard.querySelector('.section-card-body').innerHTML =
    '<div class="field-group" style="grid-template-columns:1fr 1fr 1fr;">' +
      fieldHtml('pd_structure',  'Structure',   pd.structure)  +
      fieldHtml('pd_location',   'Location',    pd.location)   +
      fieldHtml('pd_typeHammer', 'Type Hammer', pd.typeHammer) +
    '</div>';
  frag.appendChild(pileInfoCard);

  var tableCard = makeCard('Pile Log',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>'
  );
  tableCard.querySelector('.section-card-body').style.padding = '0';
  tableCard.querySelector('.section-card-body').appendChild(buildDynamicTable('d', s.pileRows));
  frag.appendChild(tableCard);

  frag.appendChild(renderRemarksCard('Work Observations and Remarks', 'workObservations', s.workObservations, 'd'));

  var wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  return wrapper;
}

/* ============================================================
   16. REMARKS CARD (shared)
   ============================================================ */

function renderRemarksCard(title, sectionKey, value, tab) {
  var card = makeCard(title,
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>'
  );
  var body = card.querySelector('.section-card-body');
  var textarea = document.createElement('textarea');
  textarea.className = 'remarks-textarea';
  textarea.dataset.remarksKey = sectionKey;
  textarea.placeholder = 'Enter observations, conditions, and any relevant field notes…';
  textarea.value = value || '';
  textarea.setAttribute('aria-label', title);
  body.appendChild(textarea);
  var photoWrap = document.createElement('div');
  photoWrap.dataset.photoSection = sectionKey;
  photoWrap.appendChild(renderPhotoStripForSection(sectionKey));
  body.appendChild(photoWrap);
  return card;
}

/* ============================================================
   16b. INSPECTOR SIGNATURE PAD
   ============================================================ */

/* Move a modal to documentElement and clear body's lingering animation
   transform so position:fixed centers on the viewport. Without this,
   the pageFadeIn animation leaves transform:translate3d(0,0,0) on
   body, which creates a containing block for the modal and pushes it
   off-screen when the user has scrolled. */
function prepareModalForViewport(modal) {
  if (!modal) return;
  try {
    document.body.style.transform = 'none';
    document.body.style.willChange = 'auto';
  } catch(_) {}
  if (modal.parentNode !== document.documentElement) {
    document.documentElement.appendChild(modal);
  }
}

function openSignaturePad() {
  if (!currentSession) return;
  var modal = document.getElementById('signature-modal');
  if (!modal) return;
  // Replace the canvas with a fresh clone so any previously attached
  // pointer/touch/mouse listeners are dropped (prevents leak if the
  // modal is opened/closed repeatedly).
  var oldCanvas = document.getElementById('signature-canvas');
  if (oldCanvas && oldCanvas.parentNode) {
    var fresh = oldCanvas.cloneNode(false);
    oldCanvas.parentNode.replaceChild(fresh, oldCanvas);
  }
  // Move modal to documentElement (html) and clear body's lingering
  // transform/will-change so position:fixed centers on the viewport.
  // pageFadeIn leaves transform:translate3d(0,0,0) on body which would
  // otherwise create a containing block and push the modal off-screen.
  prepareModalForViewport(modal);
  trapFocusOpen(modal);
  modal.classList.add('open');
  // Two rAFs guarantee the browser has performed at least one layout pass
  // after the modal becomes visible, so getBoundingClientRect() returns
  // real pixel dimensions rather than 0×0.
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { initSignatureCanvas(); });
  });
  requestAnimationFrame(function() { try { modal.focus(); } catch (e) {} });
}

function closeSignaturePad() {
  var modal = document.getElementById('signature-modal');
  if (modal) { modal.classList.remove('open'); trapFocusClose(modal); }
  if (signatureState && signatureState.cleanup) signatureState.cleanup();
  signatureState = null;
}

function initSignatureCanvas() {
  var canvas = document.getElementById('signature-canvas');
  if (!canvas) return;
  // Size canvas backing store to displayed size × devicePixelRatio so the
  // signature is crisp on retina/mobile displays.
  var rect = canvas.getBoundingClientRect();
  // Guard: if the modal hasn't fully laid out yet the rect will be 0×0.
  // Retry after a short delay rather than silently creating a 0-size canvas.
  if (rect.width < 10) { setTimeout(initSignatureCanvas, 80); return; }
  var dpr  = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.lineWidth   = 2.2;
  ctx.strokeStyle = '#111827';
  // Start with a transparent canvas — the wrapper div supplies the white
  // background visually, and the exported PNG stays transparent so it
  // doesn't hide the underlines in the Excel template.
  ctx.clearRect(0, 0, rect.width, rect.height);

  // If there's an existing signature, paint it into the canvas so the
  // user sees their previous strokes and can keep editing.
  if (currentSession && currentSession.inspectorSignature) {
    var img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = currentSession.inspectorSignature;
  }

  var drawing = false;
  var lastX = 0, lastY = 0;
  var hasStrokes = !!(currentSession && currentSession.inspectorSignature);

  function pointFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    var p = pointFromEvent(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    // Tiny dot so taps without movement still register
    ctx.arc(lastX, lastY, 1.0, 0, Math.PI * 2);
    ctx.fill = ctx.fill; // no-op safety
    ctx.fillStyle = '#111827';
    ctx.fill();
    hasStrokes = true;
    updateClearButton();
  }
  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function end(e) {
    if (!drawing) return;
    if (e) e.preventDefault();
    drawing = false;
  }
  function updateClearButton() {
    var clearBtn = document.getElementById('signature-pad-clear');
    if (clearBtn) clearBtn.disabled = !hasStrokes;
  }
  updateClearButton();

  // Pointer events cover mouse, touch, and pen on supporting browsers.
  // Fall back to touch + mouse for older Safari.
  if ('PointerEvent' in window) {
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointerleave', end);
    canvas.addEventListener('pointercancel', end);
  } else {
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  }

  signatureState = {
    canvas: canvas,
    ctx:    ctx,
    width:  rect.width,
    height: rect.height,
    hasStrokes: function() { return hasStrokes; },
    setHasStrokes: function(v) { hasStrokes = v; updateClearButton(); },
    cleanup: function() { /* listeners die with the canvas element rebuild */ }
  };
}

function clearSignaturePad() {
  if (!signatureState) return;
  signatureState.ctx.clearRect(0, 0, signatureState.width, signatureState.height);
  signatureState.setHasStrokes(false);
}

function saveSignaturePad() {
  if (!signatureState || !currentSession) return;
  if (!signatureState.hasStrokes()) {
    showToast('Sign before saving', 'info', 2000);
    return;
  }
  // Capture any unsaved form input (e.g. inspector name typed just before
  // opening the pad) so refreshSignatureRow does not paint stale values.
  collectFormData();
  try {
    var dataUrl = signatureState.canvas.toDataURL('image/png');
    currentSession.inspectorSignature       = dataUrl;
    currentSession.inspectorSignatureWidth  = signatureState.width;
    currentSession.inspectorSignatureHeight = signatureState.height;
  } catch(e) {
    showToast('Could not save signature', 'err');
    return;
  }
  closeSignaturePad();
  refreshSignatureRow();
  scheduleAutosave();
  showToast('Signature saved', 'ok', 1800);
}

function clearSavedSignature() {
  if (!currentSession) return;
  if (!confirm('Remove the saved inspector signature?')) return;
  collectFormData();
  currentSession.inspectorSignature = '';
  refreshSignatureRow();
  scheduleAutosave();
}

function refreshSignatureRow() {
  // Re-render the inspector field wrap so the UI reflects current state
  var wrap = document.querySelector('.inspector-field-wrap');
  if (!wrap || !currentSession) return;
  var parent = wrap.parentNode;
  if (!parent) return;
  var temp = document.createElement('div');
  temp.innerHTML = renderInspectorFieldHtml(currentSession.header, currentSession);
  var newNode = temp.firstChild;
  parent.replaceChild(newNode, wrap);
  // Re-wire buttons
  var newSigBtn = parent.querySelector('#signature-trigger-btn');
  if (newSigBtn) newSigBtn.addEventListener('click', function(e) { e.preventDefault(); openSignaturePad(); });
  var newSigClear = parent.querySelector('#signature-clear-btn');
  if (newSigClear) newSigClear.addEventListener('click', function(e) { e.preventDefault(); clearSavedSignature(); });
}

/* ============================================================
   17. PHOTOS SECTION
   ============================================================ */

function renderPhotosSection(session) {
  var card = makeCard('Additional Photos (Appendix)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
  );
  var body = card.querySelector('.section-card-body');
  body.innerHTML = '<p style="font-size:13px;color:var(--muted);margin-bottom:12px;">Photos added here are not linked to a specific remarks section. They appear in the Photo Appendix of the exported Excel file.</p>';
  var photoWrap = document.createElement('div');
  photoWrap.dataset.photoSection = 'appendixOnly';
  photoWrap.appendChild(renderPhotoStripForSection('appendixOnly'));
  body.appendChild(photoWrap);
  return card;
}

/* ============================================================
   18. DYNAMIC GRID TABLE
   ============================================================ */

var TABLE_DEFS = {
  a: {
    key:      'payItems',
    blankRow: blankPayItemRow,
    maxRows:  DC144_CELL_MAP.a.payItems.maxRows,
    cols: [
      { key: 'itemNo',        label: 'Item No',          width: '70px'  },
      { key: 'description',   label: 'Item Description', width: '200px' },
      { key: 'itemCode',      label: 'Item Code',        width: '90px'  },
      { key: 'planPageNum',   label: 'Plan Page #',      width: '80px'  },
      { key: 'location',      label: 'Location',         width: '120px' },
      { key: 'subcontractor', label: 'Subcontractor',    width: '120px' },
      { key: 'placedQty',     label: 'Placed Qty',       width: '140px', type: 'qty-unit' },
      { key: 'asBuiltQty',    label: 'As Built Qty',     width: '140px', type: 'qty-unit' }
    ]
  },
  b: {
    key:      'hmaPavingRows',
    blankRow: blankHMARow,
    maxRows:  DC144_CELL_MAP.b.hmaPavingRows.maxRows,
    cols: [
      { key: 'locationStation', label: 'Station Range',  width: '130px' },
      { key: 'lane',            label: 'Lane',           width: '60px'  },
      { key: 'lift',            label: 'Lift',           width: '60px'  },
      { key: 'thickness',       label: 'Thickness (in)', width: '90px', type: 'number' },
      { key: 'mixNo',           label: 'Mix No.',        width: '70px'  },
      { key: 'lotNo',           label: 'Lot No.',        width: '70px'  },
      { key: 'poundsReceived',  label: 'Lbs Received',   width: '90px', type: 'number' },
      { key: 'poundsPlaced',    label: 'Lbs Placed',     width: '90px', type: 'number' },
      { key: 'syLaid',          label: 'SY Laid',        width: '80px', type: 'number' },
      { key: 'lbsPerSY',        label: 'LBS/SY',         width: '80px', type: 'number' }
    ]
  },
  c: {
    key:      'applicationRows',
    blankRow: blankApplicationRow,
    maxRows:  DC144_CELL_MAP.c.applicationRows.maxRows,
    cols: [
      { key: 'locationStation',     label: 'Station Range',  width: '110px' },
      { key: 'lane',                label: 'Lane',           width: '55px'  },
      { key: 'lotNo',               label: 'Lot No.',        width: '65px'  },
      { key: 'tankNo',              label: 'Tank No.',       width: '65px'  },
      { key: 'truckNo',             label: 'Truck No.',      width: '65px'  },
      { key: 'gaugeStart',          label: 'Gauge Start',    width: '80px', type: 'number' },
      { key: 'gaugeFinish',         label: 'Gauge Finish',   width: '80px', type: 'number' },
      { key: 'tempOfMaterial',      label: 'Temp (°F)', width: '70px', type: 'number' },
      { key: 'conversionFactor',    label: 'Conv. Factor',   width: '80px', type: 'number' },
      { key: 'gallonsAppliedGross', label: 'Gal. Gross',     width: '80px', type: 'number' },
      { key: 'gallonsApplied60F',   label: 'Gal. @60°F', width: '80px', type: 'number' },
      { key: 'areaSY',              label: 'Area (SY)',      width: '80px', type: 'number' },
      { key: 'rateGPerSY',          label: 'Rate (G/SY)',    width: '80px', type: 'number' }
    ]
  },
  d: {
    key:      'pileRows',
    blankRow: blankPileRow,
    maxRows:  DC144_CELL_MAP.d.pileRows.maxRows,
    cols: [
      { key: 'pileNo',            label: 'Pile No.',       width: '60px'  },
      { key: 'lengthInLead',      label: 'Length (Lead)',  width: '80px', type: 'number' },
      { key: 'timberDiaTip',      label: 'Dia. Tip',       width: '65px', type: 'number' },
      { key: 'timberDiaButt',     label: 'Dia. Butt',      width: '65px', type: 'number' },
      { key: 'spliceLength',      label: 'Splice Len.',    width: '75px', type: 'number' },
      { key: 'spliceFrom',        label: 'Splice From',    width: '75px', type: 'number' },
      { key: 'penetrationLength', label: 'Penetration',    width: '80px', type: 'number' },
      { key: 'blows5ft',          label: '5.0 ft',         width: '55px', type: 'number' },
      { key: 'blows4ft',          label: '4.0 ft',         width: '55px', type: 'number' },
      { key: 'blows3ft',          label: '3.0 ft',         width: '55px', type: 'number' },
      { key: 'blows2ft',          label: '2.0 ft',         width: '55px', type: 'number' },
      { key: 'blows1ft',          label: '1.0 ft',         width: '55px', type: 'number' },
      { key: 'blowsLastInch',     label: 'Blows/Inch',     width: '70px', type: 'number' },
      { key: 'notes',             label: 'Notes',          width: '120px' }
    ]
  }
};

/* Qty/unit options for Tab A.
   value = stored string (lowercase 'custom' marker triggers customUnit input);
   label = visible dropdown text. */
var QTY_UNIT_OPTIONS = [
  { value: 'SF',     label: 'SF'     },
  { value: 'LF',     label: 'LF'     },
  { value: 'SY',     label: 'SY'     },
  { value: 'TONS',   label: 'TONS'   },
  { value: 'CY',     label: 'CY'     },
  { value: 'UNIT',   label: 'UNIT'   },
  { value: 'LS',     label: 'LS'     },
  { value: 'custom', label: 'Custom' }
];

function isCustomUnit(u) {
  return String(u || '').toLowerCase() === 'custom';
}

function normalizeUnit(u) {
  // Migrate legacy capital-C 'Custom' drafts to canonical lowercase 'custom'.
  if (isCustomUnit(u)) return 'custom';
  return u || '';
}

function getResolvedUnit(unit, customUnit) {
  if (isCustomUnit(unit)) return String(customUnit || '').trim();
  return String(unit || '').trim();
}

function buildDynamicTable(tab, rows) {
  var def     = TABLE_DEFS[tab];
  var maxRows = def.maxRows;
  rows = rows || [];

  var wrap = document.createElement('div');
  wrap.dataset.gridTab = tab;

  if (tab === 'c' || tab === 'd') {
    var hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--muted);padding:8px 16px 0;text-align:right;';
    hint.textContent = '← Scroll table horizontally →';
    wrap.appendChild(hint);
  }

  var tableWrap = document.createElement('div');
  tableWrap.className = 'data-table-wrap';

  var table = document.createElement('table');
  table.className   = 'data-table';
  table.dataset.gridTab = tab;

  var thead     = document.createElement('thead');
  var headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="width:28px;">#</th>';
  def.cols.forEach(function(col) {
    headerRow.innerHTML += '<th style="min-width:' + col.width + ';">' + col.label + '</th>';
  });
  headerRow.innerHTML += '<th style="width:40px;"></th>';
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  tbody.id   = 'grid-tbody-' + tab;
  rows.forEach(function(row) { tbody.appendChild(buildTableRow(tab, row, def)); });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  // Empty-state hint when there are no rows yet. Shows a clear message so
  // users know they need to tap the prominent Add button below.
  var emptyHint = document.createElement('div');
  emptyHint.className = 'empty-table-hint';
  emptyHint.id        = 'empty-table-hint-' + tab;
  emptyHint.style.display = rows.length === 0 ? '' : 'none';
  var entryNoun = (tab === 'a') ? 'pay item'
                : (tab === 'b') ? 'paving entry'
                : (tab === 'c') ? 'application entry'
                : 'pile entry';
  emptyHint.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>' +
    '<div>' +
      '<div class="empty-table-title">No entries yet</div>' +
      '<div class="empty-table-sub">Tap the button below to add your first ' + entryNoun + '.</div>' +
    '</div>';
  wrap.appendChild(emptyHint);

  var footer = document.createElement('div');
  footer.className = 'table-add-footer';

  var addBtn = document.createElement('button');
  addBtn.className = 'btn-add-row';
  addBtn.id        = 'add-row-btn-' + tab;
  addBtn.disabled  = rows.length >= maxRows;
  var addLabel = (tab === 'a') ? 'Add Pay Item'
               : (tab === 'b') ? 'Add Paving Entry'
               : (tab === 'c') ? 'Add Application Entry'
               : 'Add Pile Entry';
  addBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
    addLabel;
  addBtn.addEventListener('click', function() { addGridRow(tab, def, maxRows); });

  var counter = document.createElement('span');
  counter.id             = 'row-counter-' + tab;
  counter.style.cssText  = 'font-size:12px;color:var(--muted);';
  counter.textContent    = rows.length + ' / ' + maxRows + ' rows';

  footer.appendChild(addBtn);
  footer.appendChild(counter);
  wrap.appendChild(footer);

  var notice = document.createElement('div');
  notice.className       = 'row-limit-notice';
  notice.id              = 'row-limit-notice-' + tab;
  notice.style.display   = rows.length >= maxRows ? '' : 'none';
  notice.style.margin    = '0 16px 16px';
  notice.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
    'Maximum ' + maxRows + ' rows reached. Start a new DC-144 (' + tab + ') to log additional entries.';
  wrap.appendChild(notice);

  return wrap;
}

function buildTableRow(tab, rowData, def) {
  var tr     = document.createElement('tr');
  var rowNum = rowData.rowIndex + 1;
  // data-row-index is 0-based (used by deleteGridRow/collectGridRows logic).
  // data-entry-num is 1-based (used by mobile CSS ::before "Entry N" label).
  tr.dataset.rowIndex = rowData.rowIndex;
  tr.dataset.entryNum = rowNum;

  var tdNum = document.createElement('td');
  tdNum.className     = 'row-num';
  tdNum.dataset.label = 'Entry';
  tdNum.textContent   = rowNum;
  tr.appendChild(tdNum);

  def.cols.forEach(function(col) {
    var td = document.createElement('td');
    td.dataset.label = col.label;

    if (col.type === 'qty-unit') {
      var unitKey       = col.key + 'Unit';
      var unitCustomKey = col.key + 'UnitCustom';
      var currentUnit   = normalizeUnit(rowData[unitKey] || 'UNIT');

      var wrap = document.createElement('div');
      wrap.className = 'qty-cell-wrap';

      var numInput = document.createElement('input');
      numInput.type              = 'number';
      numInput.step              = 'any';
      numInput.min               = '0';
      numInput.className         = 'grid-input';
      numInput.value             = rowData[col.key] || '';
      numInput.dataset.rowIndex  = rowData.rowIndex;
      numInput.dataset.colKey    = col.key;
      numInput.dataset.gridTab   = tab;
      numInput.setAttribute('aria-label', col.label + ' quantity row ' + rowNum);
      wrap.appendChild(numInput);

      var sel = document.createElement('select');
      sel.className        = 'grid-select';
      sel.dataset.rowIndex = rowData.rowIndex;
      sel.dataset.colKey   = unitKey;
      sel.dataset.gridTab  = tab;
      sel.setAttribute('aria-label', col.label + ' unit row ' + rowNum);
      QTY_UNIT_OPTIONS.forEach(function(opt) {
        var option         = document.createElement('option');
        option.value       = opt.value;
        option.textContent = opt.label;
        if (opt.value === currentUnit) option.selected = true;
        sel.appendChild(option);
      });
      wrap.appendChild(sel);

      var customInput = document.createElement('input');
      customInput.type             = 'text';
      customInput.className        = 'qty-custom-input';
      customInput.dataset.rowIndex = rowData.rowIndex;
      customInput.dataset.colKey   = unitCustomKey;
      customInput.dataset.gridTab  = tab;
      customInput.value            = rowData[unitCustomKey] || '';
      customInput.placeholder      = 'Enter unit';
      customInput.hidden           = !isCustomUnit(currentUnit);
      customInput.disabled         = !isCustomUnit(currentUnit);
      customInput.setAttribute('aria-label', col.label + ' custom unit row ' + rowNum);
      wrap.appendChild(customInput);

      sel.addEventListener('change', function() {
        var custom = isCustomUnit(sel.value);
        customInput.hidden   = !custom;
        customInput.disabled = !custom;
        if (!custom) customInput.value = '';
        if (custom) requestAnimationFrame(function() { customInput.focus(); });
        scheduleAutosave();
      });

      td.appendChild(wrap);
    } else {
      var input = document.createElement('input');
      input.type              = col.type || 'text';
      input.className         = 'grid-input';
      input.value             = rowData[col.key] || '';
      input.dataset.rowIndex  = rowData.rowIndex;
      input.dataset.colKey    = col.key;
      input.dataset.gridTab   = tab;
      input.setAttribute('aria-label', col.label + ' row ' + rowNum);
      if (col.type === 'number') { input.step = 'any'; input.min = '0'; }
      td.appendChild(input);
    }

    tr.appendChild(td);
  });

  var tdDel = document.createElement('td');
  tdDel.dataset.label = 'Delete';
  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.setAttribute('aria-label', 'Delete row ' + rowNum);
  delBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
  delBtn.addEventListener('click', function() {
    if (!confirm('Delete this row?')) return;
    deleteGridRow(tab, rowData.rowIndex, TABLE_DEFS[tab].maxRows);
  });
  tdDel.appendChild(delBtn);
  tr.appendChild(tdDel);
  return tr;
}

function addGridRow(tab, def, maxRows) {
  var tbody   = document.getElementById('grid-tbody-' + tab);
  var counter = document.getElementById('row-counter-' + tab);
  var addBtn  = document.getElementById('add-row-btn-' + tab);
  var notice  = document.getElementById('row-limit-notice-' + tab);
  var hint    = document.getElementById('empty-table-hint-' + tab);
  if (!tbody) return;

  var currentCount = tbody.querySelectorAll('tr').length;
  if (currentCount >= maxRows) return;

  var newRow = def.blankRow(currentCount);
  tbody.appendChild(buildTableRow(tab, newRow, def));
  currentCount++;

  if (counter) counter.textContent = currentCount + ' / ' + maxRows + ' rows';
  if (addBtn)  addBtn.disabled     = currentCount >= maxRows;
  if (notice)  notice.style.display = currentCount >= maxRows ? '' : 'none';
  if (hint)    hint.style.display   = 'none';

  var newTr = tbody.lastElementChild;
  if (newTr) { var fi = newTr.querySelector('input'); if (fi) fi.focus(); }
  scheduleAutosave();
}

function deleteGridRow(tab, rowIndex, maxRows) {
  var tbody   = document.getElementById('grid-tbody-' + tab);
  var counter = document.getElementById('row-counter-' + tab);
  var addBtn  = document.getElementById('add-row-btn-' + tab);
  var notice  = document.getElementById('row-limit-notice-' + tab);
  var hint    = document.getElementById('empty-table-hint-' + tab);
  if (!tbody) return;

  var rows   = tbody.querySelectorAll('tr');
  var target = null;
  rows.forEach(function(r) { if (parseInt(r.dataset.rowIndex, 10) === rowIndex) target = r; });
  if (target) tbody.removeChild(target);

  var remaining = tbody.querySelectorAll('tr');
  remaining.forEach(function(r, i) {
    r.dataset.rowIndex = i;
    r.dataset.entryNum = i + 1;
    var numCell = r.querySelector('.row-num');
    if (numCell) numCell.textContent = i + 1;
    r.querySelectorAll('[data-row-index]').forEach(function(inp) { inp.dataset.rowIndex = i; });
  });

  var currentCount = remaining.length;
  if (counter) counter.textContent  = currentCount + ' / ' + maxRows + ' rows';
  if (addBtn)  addBtn.disabled      = currentCount >= maxRows;
  if (notice)  notice.style.display = currentCount >= maxRows ? '' : 'none';
  if (hint)    hint.style.display   = currentCount === 0 ? '' : 'none';

  scheduleAutosave();
}

/* ============================================================
   19. COLLECT FORM DATA into currentSession
   ============================================================ */

function collectFormData() {
  if (!currentSession || !currentTab) return;
  var h   = currentSession.header;
  var tab = currentTab;

  // Header fields — use getElementById (inputs have id="field-{key}")
  var headerFields = ['projectName','contractId','contractor','inspectorName','date',
    'weatherAMCond','weatherAMHigh','weatherAMLow','weatherPMCond','weatherPMHigh','weatherPMLow'];
  headerFields.forEach(function(f) {
    var el = document.getElementById('field-' + f);
    if (el) h[f] = el.value;
  });

  // Item header (tabs b/c/d)
  if (tab !== 'a' && currentSession.itemHeader) {
    var ih = currentSession.itemHeader;
    var ihMap = { 'ih_itemNumber': 'itemNumber', 'ih_description': 'description', 'ih_itemCode': 'itemCode' };
    Object.keys(ihMap).forEach(function(domKey) {
      var el = document.getElementById('field-' + domKey);
      if (el) ih[ihMap[domKey]] = el.value;
    });
  }

  var s = currentSession.section;

  if (tab === 'a') {
    s.payItems = collectGridRows('a');
    ['environmental','trafficControl','workObservations'].forEach(function(k) {
      var ta = document.querySelector('[data-remarks-key="' + k + '"]');
      if (ta) s.remarks[k] = ta.value;
    });
    document.querySelectorAll('[data-wh-key]').forEach(function(inp) {
      var key = inp.dataset.whKey;
      var col = inp.dataset.whCol;
      if (s.workHours[key]) s.workHours[key][col] = inp.value;
    });
  }

  if (tab === 'b') {
    s.hmaPavingRows = collectGridRows('b');
    var wobsB = document.querySelector('[data-remarks-key="workObservations"]');
    if (wobsB) s.workObservations = wobsB.value;
    var tmap = {
      'temp_producer':     function(v) { s.temperature.producer    = v; },
      'temp_mix1_mixNo':   function(v) { s.temperature.mix1.mixNo   = v; },
      'temp_mix1_highest': function(v) { s.temperature.mix1.highestF= v; },
      'temp_mix1_lowest':  function(v) { s.temperature.mix1.lowestF = v; },
      'temp_mix1_avg':     function(v) { s.temperature.mix1.avgF    = v; },
      'temp_mix2_mixNo':   function(v) { s.temperature.mix2.mixNo   = v; },
      'temp_mix2_highest': function(v) { s.temperature.mix2.highestF= v; },
      'temp_mix2_lowest':  function(v) { s.temperature.mix2.lowestF = v; },
      'temp_mix2_avg':     function(v) { s.temperature.mix2.avgF    = v; }
    };
    Object.keys(tmap).forEach(function(k) {
      var el = document.getElementById('field-' + k);
      if (el) tmap[k](el.value);
    });
  }

  if (tab === 'c') {
    var mi    = s.materialInfo;
    var miMap = { 'mi_grade': 'gradeOfMaterial', 'mi_producer': 'producerLocation', 'mi_hauler': 'haulerLocation' };
    Object.keys(miMap).forEach(function(k) {
      var el = document.getElementById('field-' + k);
      if (el) mi[miMap[k]] = el.value;
    });
    s.applicationRows = collectGridRows('c');
    var stEl = document.getElementById('field-spec_tempRange');
    var srEl = document.getElementById('field-spec_rate');
    if (stEl) s.specifiedTempRange         = stEl.value;
    if (srEl) s.specifiedRateOfApplication = srEl.value;
    var wobsC = document.querySelector('[data-remarks-key="workObservations"]');
    if (wobsC) s.workObservations = wobsC.value;
  }

  if (tab === 'd') {
    var pd    = s.pileDescriptor;
    var pdMap = { 'pd_structure': 'structure', 'pd_location': 'location', 'pd_typeHammer': 'typeHammer' };
    Object.keys(pdMap).forEach(function(k) {
      var el = document.getElementById('field-' + k);
      if (el) pd[pdMap[k]] = el.value;
    });
    s.pileRows = collectGridRows('d');
    var wobsD  = document.querySelector('[data-remarks-key="workObservations"]');
    if (wobsD) s.workObservations = wobsD.value;
  }

  // Photo captions
  document.querySelectorAll('[data-photo-caption-idx]').forEach(function(inp) {
    var idx = parseInt(inp.dataset.photoCaptionIdx, 10);
    if (currentSession.photos[idx]) currentSession.photos[idx].caption = inp.value;
  });
}

function collectGridRows(tab) {
  var def   = TABLE_DEFS[tab];
  var tbody = document.getElementById('grid-tbody-' + tab);
  if (!tbody) return [];
  var rows = [];
  tbody.querySelectorAll('tr').forEach(function(tr, idx) {
    var row = def.blankRow(idx);
    tr.querySelectorAll('[data-col-key]').forEach(function(el) {
      row[el.dataset.colKey] = el.value;
    });
    rows.push(row);
  });
  return rows.slice(0, def.maxRows);
}

/* ============================================================
   20. WIRE FORM AUTO-SAVE LISTENERS
   ============================================================ */

function wireFormAutosave() {
  var container = document.getElementById('form-content');
  if (!container) return;
  container.addEventListener('input',  function() { scheduleAutosave(); });
  container.addEventListener('change', function() { scheduleAutosave(); });
}

/* ============================================================
   21. PHOTO MANAGEMENT
   ============================================================ */

function renderPhotoStripForSection(sectionKey) {
  var wrap = document.createElement('div');
  wrap.className = 'photo-strip';
  wrap.id        = 'photo-strip-' + sectionKey;

  // Add button renders FIRST so photos accumulate to its right as they are added.
  var addItem = document.createElement('div');
  addItem.className = 'photo-item photo-add-item';
  addItem.innerHTML =
    '<button class="photo-add-btn" data-section-key="' + esc(sectionKey) + '" aria-label="Add photo to ' + sectionKey + '">' +
      '<div class="photo-add-icon">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
        '<svg class="photo-add-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '</div>' +
      '<span class="photo-add-label">Add Photo</span>' +
    '</button>';
  addItem.querySelector('.photo-add-btn').addEventListener('click', function() {
    triggerPhotoCapture(sectionKey);
  });
  wrap.appendChild(addItem);

  if (currentSession && currentSession.photos) {
    currentSession.photos.forEach(function(photo, idx) {
      if (photo.sectionKey === sectionKey) {
        wrap.appendChild(buildPhotoThumb(photo, idx));
      }
    });
  }

  return wrap;
}

function buildPhotoThumb(photo, idx) {
  var item = document.createElement('div');
  item.className      = 'photo-item';
  item.dataset.photoIdx = idx;
  item.innerHTML =
    '<div class="photo-thumb">' +
      '<img src="' + photo.base64 + '" alt="Photo ' + (idx+1) + '" loading="lazy">' +
      '<button class="photo-del-btn" data-photo-idx="' + idx + '" aria-label="Delete photo ' + (idx+1) + '">×</button>' +
    '</div>' +
    '<label class="photo-caption-label" for="photo-cap-' + idx + '">Caption</label>' +
    '<textarea class="photo-caption-input" id="photo-cap-' + idx + '" data-photo-caption-idx="' + idx + '" rows="2" placeholder="Add a caption…" aria-label="Caption for photo ' + (idx+1) + '" maxlength="200">' + esc(photo.caption||'') + '</textarea>';
  item.querySelector('.photo-del-btn').addEventListener('click', function() { deletePhoto(idx); });
  var ta = item.querySelector('.photo-caption-input');
  ta.addEventListener('input', function() {
    if (currentSession && currentSession.photos[idx]) {
      currentSession.photos[idx].caption = ta.value;
    }
    scheduleAutosave();
  });
  return item;
}

function triggerPhotoCapture(sectionKey) {
  photoTargetKey = sectionKey;
  var input = document.getElementById('photo-file-input');
  if (input) input.click();
}

function handlePhotoCaptureEvent(event) {
  var file = event.target.files && event.target.files[0];
  if (!file || !currentSession) { event.target.value = ''; return; }
  if (!file.type.startsWith('image/')) {
    showToast('Only image files are accepted', 'err');
    event.target.value = '';
    return;
  }
  var targetKey = photoTargetKey || 'appendixOnly';
  pendingPhotoOps++;
  updatePhotoPendingIndicator();
  // Insert a placeholder thumb immediately so the user sees their photo
  // taking effect even if compression takes a moment. The placeholder is
  // replaced with the real thumb when compression completes.
  var placeholder = insertPhotoPlaceholder(targetKey);
  compressImage(file, function(base64, w, h) {
    if (!base64) {
      // Compression pipeline failed — clean up without permanently blocking export
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      pendingPhotoOps = Math.max(0, pendingPhotoOps - 1);
      updatePhotoPendingIndicator();
      showToast('Could not process image — try a different file', 'err');
      return;
    }
    var photo = {
      photoIndex:   currentSession.photos.length + 1,
      sectionKey:   targetKey,
      caption:      '',
      base64:       base64,
      originalName: file.name,
      capturedAt:   new Date().toISOString(),
      widthPx:      w,
      heightPx:     h
    };
    currentSession.photos.push(photo);
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    var strip = document.getElementById('photo-strip-' + photo.sectionKey);
    if (strip) {
      var newThumb = buildPhotoThumb(photo, currentSession.photos.length - 1);
      // Add button is always first; new photos append to the end of the strip.
      strip.appendChild(newThumb);
    }
    pendingPhotoOps = Math.max(0, pendingPhotoOps - 1);
    updatePhotoPendingIndicator();
    scheduleAutosave();
  });
  event.target.value = '';
}

function insertPhotoPlaceholder(sectionKey) {
  var strip = document.getElementById('photo-strip-' + sectionKey);
  if (!strip) return null;
  var ph = document.createElement('div');
  ph.className = 'photo-item photo-placeholder';
  ph.setAttribute('aria-label', 'Photo processing');
  ph.innerHTML =
    '<div class="photo-thumb photo-thumb-placeholder">' +
      '<div class="photo-spinner" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="photo-caption-label">Processing…</div>';
  // Add button is first; placeholder goes at the end while compression runs.
  strip.appendChild(ph);
  return ph;
}

function updatePhotoPendingIndicator() {
  var el = document.getElementById('autosave-status');
  if (!el) return;
  var text = '', color = '';
  if (pendingPhotoOps > 0) {
    text  = 'Processing ' + pendingPhotoOps + ' photo' + (pendingPhotoOps > 1 ? 's' : '') + '…';
    color = 'var(--accent)';
  }
  el.textContent = text;
  el.style.color = color;
  setMobileStatusPill(text, color);
}

function deletePhoto(idx) {
  if (!currentSession || !currentSession.photos) return;
  currentSession.photos.splice(idx, 1);
  currentSession.photos.forEach(function(p, i) { p.photoIndex = i + 1; });
  reRenderAllPhotoStrips();
  scheduleAutosave();
}

function reRenderAllPhotoStrips() {
  document.querySelectorAll('[data-photo-section]').forEach(function(wrap) {
    var key = wrap.dataset.photoSection;
    wrap.innerHTML = '';
    wrap.appendChild(renderPhotoStripForSection(key));
  });
}

/* ── Image compression pipeline ─────────────────────────────── */
function compressImage(file, callback) {
  var MAX_LONG_SIDE  = 1400;
  var BYPASS_SIZE    = 150 * 1024;
  // WebP and HEIC/HEIF must always go through the canvas pipeline so they
  // are normalized to JPEG before storage. ExcelJS only accepts PNG/JPEG.
  var needsNormalize = /webp|heic|heif/i.test(file.type);

  if (file.size < BYPASS_SIZE && !needsNormalize) {
    var reader = new FileReader();
    reader.onerror = function() { callback(null, 0, 0); };
    reader.onloadend = function() {
      if (reader.error) { callback(null, 0, 0); return; }
      var img    = new Image();
      img.onerror = function() { callback(null, 0, 0); };
      img.onload  = function() { callback(reader.result, img.naturalWidth, img.naturalHeight); };
      img.src    = reader.result;
    };
    reader.readAsDataURL(file);
    return;
  }

  var objectURL = URL.createObjectURL(file);
  var img       = new Image();
  img.onload = function() {
    URL.revokeObjectURL(objectURL);
    var w     = img.naturalWidth, h = img.naturalHeight;
    var scale = Math.min(1.0, MAX_LONG_SIDE / Math.max(w, h));
    var tw    = Math.round(w * scale), th = Math.round(h * scale);
    var canvas       = document.createElement('canvas');
    canvas.width     = tw;
    canvas.height    = th;
    canvas.getContext('2d').drawImage(img, 0, 0, tw, th);
    canvas.toBlob(function(blob) {
      if (!blob) { callback(canvas.toDataURL('image/jpeg', 0.72), tw, th); return; }
      if (blob.size <= 200 * 1024) {
        blobToDataURL(blob, function(dataURL) { callback(dataURL, tw, th); });
      } else {
        canvas.toBlob(function(blob2) {
          blobToDataURL(blob2 || blob, function(dataURL) { callback(dataURL, tw, th); });
        }, 'image/jpeg', 0.58);
      }
    }, 'image/jpeg', 0.72);
  };
  img.onerror = function() { URL.revokeObjectURL(objectURL); callback(null, 0, 0); };
  img.src = objectURL;
}

function blobToDataURL(blob, cb) {
  var reader     = new FileReader();
  reader.onloadend = function() { cb(reader.result); };
  reader.readAsDataURL(blob);
}

/* ============================================================
   22. EXCEL EXPORT ENGINE
   ----
   The export MUST load the official DC-144 workbook
   (data/dc144-template.xlsx) and write values into it only.
   The NJDOT form layout, NJDOT logo, merged ranges, column
   widths, row heights, borders, fonts, fills, alignments,
   page setup, and images live in the template — do not
   recreate, rebuild, or restyle them in code.
   ============================================================ */

var DC144_SHEET_NAME_BY_TAB = {
  a: 'DC-144 (a) Daily Work Report',
  b: 'DC-144 (b) HMA Supplement',
  c: 'DC-144 (c) Bituminous Materials',
  d: 'DC-144 (d) Pile Driving Suppl.'
};

function loadDc144TemplateWorkbook() {
  if (templateCache) {
    // Always reload — once we writeBuffer() on a cached workbook the
    // underlying state can drift. Safer to fetch a fresh copy each export.
    templateCache = null;
  }
  return fetch(TEMPLATE_URL, { cache: 'no-cache' })
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Could not load official DC-144 template (HTTP ' + res.status + ' on ' + TEMPLATE_URL + '). The export requires the real NJDOT workbook at data/dc144-template.xlsx.');
      }
      return res.arrayBuffer();
    })
    .then(function(buffer) {
      var wb = new ExcelJS.Workbook();
      return wb.xlsx.load(buffer).then(function() {
        if (wb.worksheets.length < 4) {
          throw new Error('DC-144 template is not the official NJDOT workbook — expected sheets a/b/c/d, found ' + wb.worksheets.length + '.');
        }
        return wb;
      });
    });
}

/* ── Export review modal ─────────────────────────────────────── */
function showExportReview(session) {
  collectFormData();
  var v   = validateBeforeExport(session);
  var tab = TAB_META[session.tab] || TAB_META['a'];
  var h   = session.header || {};
  var rowCount   = getSessionRowCount(session);
  var photoCount = (session.photos && session.photos.length) || 0;
  var modal = document.getElementById('export-review-modal');
  var body  = document.getElementById('export-review-body');
  if (!modal || !body) { doActualExport(session); return; }

  var html = '<table class="export-review-table">' +
    '<tr><td>Form type</td><td><strong>' + esc(tab.label + ' — ' + tab.name) + '</strong></td></tr>' +
    '<tr><td>Project</td><td>' + esc(h.projectName || '—') + '</td></tr>' +
    '<tr><td>Contract ID</td><td>' + esc(h.contractId || '—') + '</td></tr>' +
    '<tr><td>Contractor</td><td>' + esc(h.contractor || '—') + '</td></tr>' +
    '<tr><td>Inspector</td><td>' + esc(h.inspectorName || '—') + '</td></tr>' +
    '<tr><td>Date</td><td>' + esc(h.date || '—') + '</td></tr>' +
    '<tr><td>Rows</td><td>' + rowCount + '</td></tr>' +
    '<tr><td>Photos</td><td>' + photoCount + '</td></tr>' +
    '</table>';

  if (v.criticals.length) {
    html += '<div class="export-review-section export-review-critical">' +
      '<div class="export-review-section-title">Errors — must fix before export</div>' +
      v.criticals.map(function(c) { return '<div class="export-review-item">&#x26A0; ' + esc(c) + '</div>'; }).join('') +
      '</div>';
  }
  if (v.warnings.length) {
    html += '<div class="export-review-section export-review-warn">' +
      '<div class="export-review-section-title">Warnings — review before export</div>' +
      v.warnings.map(function(w) { return '<div class="export-review-item">&#x26A0; ' + esc(w) + '</div>'; }).join('') +
      '</div>';
  }

  body.innerHTML = html;

  var confirmBtn = document.getElementById('export-review-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = v.criticals.length > 0;
    confirmBtn.title    = v.criticals.length > 0 ? 'Fix errors before exporting' : '';
  }

  // Move modal to documentElement and clear body's transform so
  // position:fixed centers on the viewport regardless of scroll.
  prepareModalForViewport(modal);
  trapFocusOpen(modal);
  modal.classList.add('open');
  modal.dataset.sessionKey = session.photoKey;
  requestAnimationFrame(function() { try { modal.focus(); } catch (e) {} });
}

function closeExportReview() {
  var modal = document.getElementById('export-review-modal');
  if (modal) { modal.classList.remove('open'); trapFocusClose(modal); }
}

function confirmExport() {
  closeExportReview();
  if (!currentSession) return;
  doActualExport(currentSession);
}

function doActualExport(session) {
  if (typeof ExcelJS === 'undefined') {
    showToast('Export library failed to load — check your connection and reload the page', 'err', 6000);
    return;
  }
  var exportBtn1 = document.getElementById('topbar-export-btn');
  var exportBtn2 = document.getElementById('actionbar-export-btn');

  function setLoading(loading) {
    [exportBtn1, exportBtn2].forEach(function(btn) {
      if (!btn) return;
      btn.disabled = loading;
      btn.innerHTML = loading
        ? '<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Generating…'
        : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export XLSX';
    });
  }

  setLoading(true);

  loadDc144TemplateWorkbook()
    .then(function(wb) { return buildDc144WorkbookFromTemplate(wb, session); })
    .then(function(wb) {
      assertDc144TemplatePreserved(wb, session.tab);
      assertPhotoAppendixPreserved(wb, session);
      pruneWorkbookToSelectedForm(wb, session.tab, false);
      wb.calcProperties = wb.calcProperties || {};
      wb.calcProperties.fullCalcOnLoad = true;
      return wb.xlsx.writeBuffer();
    })
    .then(function(buffer) {
      var safeProject = (session.header.projectName || 'DC144').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 30);
      var safeDate    = (session.header.date || todayISO()).replace(/-/g, '');
      var filename    = 'DC-144-' + session.tab.toUpperCase() + '-' + safeDate + '-' + safeProject + '.xlsx';
      triggerDownload(buffer, filename);
      setLoading(false);
      showToast('Export downloaded: ' + filename, 'ok', 3000);
    })
    .catch(function(err) {
      setLoading(false);
      showToast('Export failed: ' + err.message, 'err', 6000);
      console.error('DC-144 export error:', err);
    });
}

function handleExport() {
  if (!currentSession) return;
  if (pendingPhotoOps > 0) {
    showToast('Still processing ' + pendingPhotoOps + ' photo(s). Try again in a moment.', 'info', 3000);
    // Poll briefly then auto-retry once finished
    var waitStart = Date.now();
    var poll = setInterval(function() {
      if (pendingPhotoOps === 0) { clearInterval(poll); handleExport(); }
      else if (Date.now() - waitStart > 30000) {
        clearInterval(poll);
        showToast('Photo processing timed out. Export with what is ready?', 'err', 5000);
      }
    }, 400);
    return;
  }
  // Show the review modal — actual export fires only after user confirms.
  showExportReview(currentSession);
}

function buildDc144WorkbookFromTemplate(wb, session) {
  var tab       = session.tab;
  var sheetName = DC144_SHEET_NAME_BY_TAB[tab];
  var ws        = wb.getWorksheet(sheetName);
  if (!ws) {
    throw new Error('Official DC-144 worksheet "' + sheetName + '" missing from template.');
  }

  // Write values and apply targeted alignment/width fixes.
  patchHeaderFields(ws, session);
  patchColumnHeaders(ws, tab);
  // Widen column 1 so label text ("Project Name:", "Contract ID/ DP#:", etc.)
  // fits without overflowing into the value cells to its right.
  try { ws.getColumn(1).width = (tab === 'b') ? 18 : 14; } catch(e) {}
  patchItemHeader(ws, session);
  patchDataRows(ws, session);
  patchRemarksFields(ws, session);
  if (tab === 'a') patchWorkHours(ws, session);
  if (tab === 'b') patchTemperature(ws, session);
  if (tab === 'c') patchMaterialInfo(ws, session);
  if (tab === 'd') patchPileDescriptor(ws, session);

  // Insert a manual page break before the Work Observations section so that
  // section always starts on page 2. Without this, Work Observations begins
  // at the very bottom of page 1 and spills onto page 2.
  (function() {
    var wobMap = {
      a: DC144_CELL_MAP.a.remarks.workObservations,
      b: DC144_CELL_MAP.b.workObservations,
      c: DC144_CELL_MAP.c.workObservations,
      d: DC144_CELL_MAP.d.workObservations
    };
    var wobRef = wobMap[tab];
    if (wobRef && wobRef.r > 1) {
      var breakAfterRow = wobRef.r - 2; // break before the section label so it starts on page 2
      if (!ws.model.rowBreaks) ws.model.rowBreaks = [];
      // Remove any existing break at this position before adding ours
      ws.model.rowBreaks = ws.model.rowBreaks.filter(function(b) { return b.id !== breakAfterRow; });
      ws.model.rowBreaks.push({ id: breakAfterRow, max: 16383, man: 1 });
    }
  }());

  // Default print scaling: fit all columns onto one sheet width so
  // nothing clips at the right edge when the inspector prints directly
  // from Excel without adjusting page layout settings.
  try {
    ws.pageSetup.fitToPage  = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
  } catch(e) {}

  // Replace the template's "Attach additional sketches..." footer text
  // with a friendlier appendix pointer + center the cell.
  rewriteAppendixFooterText(ws, session);

  // Inspector signature — drawn via signature pad modal, embedded next
  // to the printed name on the official form. Photos live on their own
  // appendix sheet; this signature is a small floating image on the
  // form worksheet itself.
  if (session.inspectorSignature) {
    embedInspectorSignature(wb, ws, session);
  }

  // Photos live on a separate appendix sheet. Adding the appendix
  // must never reach back into the official form worksheet.
  if (session.photos && session.photos.length > 0) {
    appendPhotoSheet(wb, session.photos);
  }
  return wb;
}

/* Scan the worksheet for the official "Attach additional sketches..."
   note (case-insensitive substring match) and overwrite it with a
   shorter appendix pointer, centered. Cells with no match are
   left untouched. */
function rewriteAppendixFooterText(ws, session) {
  if (!ws) return;
  var hasPhotos = !!(session.photos && session.photos.length);
  // Keep the replacement text short so it fits in the same cell space as
  // the original "Attach additional sketches…" note without overflowing.
  var newText   = hasPhotos
    ? 'See Photo Appendix tab'
    : 'No photos attached';
  // Some templates may say "Attach additional sketches" or
  // "Attach all sketches" — match the longest distinctive phrase first
  // and fall back to a shorter one.
  var markers = ['attach additional sketches', 'attach additional', 'additional sketches'];
  var rowCount = Math.max(ws.rowCount || 0, 100);
  var found = false;
  for (var r = rowCount; r >= 1 && !found; r--) {
    // Scan from the bottom of the sheet upward — the appendix-footer note
    // is always near the bottom of the official DC-144 form. This avoids
    // false positives in the header band.
    var row = ws.getRow(r);
    if (!row) continue;
    var maxCol = Math.max(row.cellCount || 0, row.actualCellCount || 0, 24);
    for (var c = 1; c <= maxCol; c++) {
      var cell = row.getCell(c);
      var txt  = _cellPlainText(cell);
      if (!txt) continue;
      var lower = txt.toLowerCase();
      for (var m = 0; m < markers.length; m++) {
        if (lower.indexOf(markers[m]) !== -1) {
          // Preserve existing font/border/fill — only change value + alignment.
          // Do not use shrinkToFit here — the cell is narrow at the bottom of the
          // form and shrinkToFit would compress the text to an unreadably tiny size.
          cell.value = newText;
          var existing = cell.alignment || {};
          cell.alignment = {
            horizontal:  'center',
            vertical:    'middle',
            wrapText:    false,
            shrinkToFit: false,
            indent:      existing.indent
          };
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
}

/* Embed inspector signature image on the form worksheet, positioned
   next to the printed-name cell. The image is sized small (180×40 px)
   so it sits on the same row as the printed name without disturbing
   adjacent cells or row heights. */
function embedInspectorSignature(wb, ws, session) {
  try {
    var sigData = String(session.inspectorSignature || '');
    if (!sigData) return;
    var base64 = sigData.replace(/^data:image\/\w+;base64,/, '');
    if (!base64) return;
    var nameMap = DC144_CELL_MAP[session.tab] && DC144_CELL_MAP[session.tab].header
      && DC144_CELL_MAP[session.tab].header.inspectorName;
    if (!nameMap) return;
    var imageId = wb.addImage({ base64: base64, extension: 'png' });
    // Anchor right after the name column. tl is 0-based.
    // Place at row of inspector name, offset 2 columns right of name cell.
    var anchorCol = (nameMap.c - 1) + 2; // 0-based
    var anchorRow = (nameMap.r - 1);     // 0-based
    // Signature height in px. Starts one row above the inspector line so the
    // bulk of the signature sits above the underline and descenders cross below,
    // matching how handwritten signatures look on a printed baseline.
    // Width is derived from the stored canvas aspect ratio to avoid distortion.
    var sigW = session.inspectorSignatureWidth  || 400;
    var sigH = session.inspectorSignatureHeight || 100;
    var embedH = 48;
    var embedW = Math.max(60, Math.round(embedH * sigW / sigH));
    ws.addImage(imageId, {
      tl:     { col: anchorCol, row: anchorRow - 1 },
      ext:    { width: embedW, height: embedH },
      editAs: 'oneCell'
    });
  } catch(e) {
    // Silent: failing to embed a signature should not break the export.
    console.warn('Inspector signature embed failed:', e);
  }
}

// Per-tab lower bounds for merged-range counts. Numbers come from the
// official NJDOT dc144.xls inventory (Tab A=95, B=76, C=50, D=70); the
// thresholds give a small margin for ExcelJS minor-version differences
// but still catch a stripped/blank workbook.
var DC144_MIN_MERGES_BY_TAB = { a: 90, b: 70, c: 45, d: 65 };

function assertDc144TemplatePreserved(wb, tab) {
  var selectedTab = tab || 'a';
  var sheetName   = DC144_SHEET_NAME_BY_TAB[selectedTab];
  var ws          = wb.getWorksheet(sheetName);

  // 1. Worksheet must exist under its OFFICIAL name (not just an alias
  //    or a re-created stub).
  if (!ws) {
    throw new Error('DC-144 worksheet "' + sheetName + '" missing after export build.');
  }

  // 2. Merge count meets the per-tab lower bound. ExcelJS exposes merges
  //    via ws.model.merges as either an array of ranges OR an object keyed
  //    by range string after .load() — handle both shapes.
  var modelMerges = (ws.model && ws.model.merges) || [];
  var mergeCount  = Array.isArray(modelMerges) ? modelMerges.length : Object.keys(modelMerges).length;
  var minMerges   = DC144_MIN_MERGES_BY_TAB[selectedTab] || 1;
  if (mergeCount < minMerges) {
    throw new Error(
      'DC-144 ' + selectedTab.toUpperCase() + ' layout was not preserved — merges=' + mergeCount +
      ' (need >=' + minMerges + '). The data/dc144-template.xlsx file is not the official NJDOT workbook. Re-convert dc144.xls to .xlsx with all formatting and the NJDOT logo intact, then replace data/dc144-template.xlsx.'
    );
  }

  // 3. Image check. Primary probe: ws.getImages() — the worksheet-scoped
  //    list ExcelJS builds when it parses drawing relationships.
  //    Fallback: workbook.model.media — the global media array that
  //    survives even when the per-sheet drawings array is missing on
  //    certain LibreOffice/openpyxl-emitted workbooks.
  var sheetImages   = (typeof ws.getImages === 'function') ? (ws.getImages() || []) : [];
  var workbookMedia = (wb.model && wb.model.media) || [];
  var imageCount    = sheetImages.length;
  if (imageCount < 1 && workbookMedia.length > 0) imageCount = workbookMedia.length;

  if (selectedTab === 'a' && imageCount < 1) {
    throw new Error(
      'DC-144 A is missing the NJDOT logo image (images=0). Re-convert dc144.xls to .xlsx with the NJDOT logo intact, then replace data/dc144-template.xlsx.'
    );
  }

  // 4. Tab A title/header sentinel cells must still carry the official
  //    DC-144 text. Catches the case where someone overwrote A1/A2/A3
  //    or accidentally cleared the form header band.
  if (selectedTab === 'a') {
    var a1 = String(_cellPlainText(ws.getCell(1, 1)) || '');
    var a2 = String(_cellPlainText(ws.getCell(2, 1)) || '');
    var a3 = String(_cellPlainText(ws.getCell(3, 1)) || '');
    if (a1.toUpperCase().indexOf('DC-144') === -1) {
      throw new Error('DC-144 A header cell A1 lost the form-number text — expected "Form DC-144 (a) …", got ' + JSON.stringify(a1) + '.');
    }
    if (a2.toUpperCase().indexOf('NEW JERSEY DEPARTMENT OF TRANSPORTATION') === -1) {
      throw new Error('DC-144 A header cell A2 lost the NJDOT title — expected "New Jersey Department of Transportation", got ' + JSON.stringify(a2) + '.');
    }
    if (a3.toLowerCase().indexOf('daily work report') === -1) {
      throw new Error('DC-144 A header cell A3 lost the report title — expected "Daily Work Report", got ' + JSON.stringify(a3) + '.');
    }
  }
}

// ExcelJS stores cell values as either a primitive (string/number),
// a Date, or a rich-text object { richText: [{text, font}, …] }.
// This helper flattens any of those shapes into a plain string for
// sentinel-text comparison.
function _cellPlainText(cell) {
  if (!cell) return '';
  var v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (v.richText && Array.isArray(v.richText)) {
    return v.richText.map(function(rt) { return rt.text || ''; }).join('');
  }
  if (typeof v === 'object' && 'result' in v) return String(v.result || '');
  return String(v);
}

function setCellValue(ws, r, c, value) {
  if (!r || !c) return;
  try {
    ws.getCell(r, c).value = (value !== undefined && value !== null) ? value : '';
  } catch(e) {}
}

/* Like setCellValue but preserves existing template alignment and lets
   callers opt into wrap/shrink/top/center/middle/bottom to keep long user
   text inside the official DC-144 cell bounds — without expanding row heights. */
function setCellValueReadable(ws, r, c, value, opts) {
  if (!r || !c) return;
  try {
    var cell = ws.getCell(r, c);
    var savedBorder = cell.border;   // preserve template underlines/borders
    cell.value = (value !== undefined && value !== null) ? value : '';
    opts = opts || {};
    var existing = cell.alignment || {};
    var alignment = {
      horizontal:  existing.horizontal,
      vertical:    existing.vertical,
      wrapText:    existing.wrapText,
      shrinkToFit: existing.shrinkToFit,
      indent:      existing.indent
    };
    if (opts.wrap)    alignment.wrapText    = true;
    if (opts.shrink)  alignment.shrinkToFit = true;
    if (opts.top)     alignment.vertical    = 'top';
    if (opts.center)  alignment.horizontal  = 'center';
    if (opts.middle)  alignment.vertical    = 'middle';
    if (opts.bottom)  alignment.vertical    = 'bottom';
    cell.alignment = alignment;
    if (savedBorder) cell.border = savedBorder;  // restore template borders
  } catch(e) {}
}

/* Collapse a sorted list of photo numbers into a compact range string.
   [1,2,3,5,7,8] → "1–3, 5, 7–8".  Used in remarks text. */
function compactPhotoNumbers(nums) {
  nums = (nums || [])
    .map(function(n) { return Number(n); })
    .filter(function(n) { return isFinite(n); })
    .sort(function(a, b) { return a - b; });
  if (!nums.length) return '';

  var ranges = [];
  var start  = nums[0];
  var prev   = nums[0];
  for (var i = 1; i <= nums.length; i++) {
    var n = nums[i];
    if (n === prev + 1) { prev = n; continue; }
    ranges.push(start === prev ? String(start) : start + '–' + prev);
    start = n;
    prev  = n;
  }
  return ranges.join(', ');
}

/* Pre-export validation. Returns an error string or null. */
// Returns { criticals: string[], warnings: string[] }.
// criticals block export; warnings show in review modal but allow proceeding.
function validateBeforeExport(session) {
  var criticals = [];
  var warnings  = [];
  if (!session) return { criticals: criticals, warnings: warnings };

  var h = session.header || {};
  if (!String(h.projectName  || '').trim()) warnings.push('Project name is blank');
  if (!String(h.contractId   || '').trim()) warnings.push('Contract ID is blank');
  if (!String(h.contractor   || '').trim()) warnings.push('Contractor is blank');
  if (!String(h.inspectorName|| '').trim()) warnings.push('Inspector name is blank');
  if (!String(h.date         || '').trim()) warnings.push('Date is blank');

  // Tab A: custom units must have text entered
  if (session.tab === 'a') {
    var rows = (session.section && session.section.payItems) || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (isCustomUnit(row.placedQtyUnit) && !String(row.placedQtyUnitCustom || '').trim()) {
        criticals.push('Row ' + (i + 1) + ': Placed Qty has "Custom" selected but no unit typed.');
      }
      if (isCustomUnit(row.asBuiltQtyUnit) && !String(row.asBuiltQtyUnitCustom || '').trim()) {
        criticals.push('Row ' + (i + 1) + ': As Built Qty has "Custom" selected but no unit typed.');
      }
    }
  }

  return { criticals: criticals, warnings: warnings };
}

/* Remove unused blank DC-144 worksheets from the export so an A-only export
   does not ship blank B/C/D sheets. Photo Appendix is always kept.
   includeAllForms=true bypasses pruning entirely. */
function pruneWorkbookToSelectedForm(wb, activeTab, includeAllForms) {
  if (includeAllForms) return;
  var activeSheetName = DC144_SHEET_NAME_BY_TAB[activeTab];
  if (!activeSheetName) return;
  var keepNames = {};
  keepNames[activeSheetName] = true;
  if (wb.getWorksheet('Photo Appendix')) keepNames['Photo Appendix'] = true;
  wb.worksheets.slice().forEach(function(ws) {
    if (!keepNames[ws.name]) {
      try { wb.removeWorksheet(ws.id); } catch(e) {}
    }
  });
  try { wb.views = [{ activeTab: 0 }]; } catch(e) {}
}

// Inspector name and date fall back to setCellValue (no opts) so they
// inherit the template's native alignment — same as project name,
// contract ID, and contractor. This positions the text just above the
// printed underline instead of sitting on it.
var DC144_BOTTOM_ALIGN_HEADER_FIELDS = {};

// contractId and contractor use narrow merged cells on all tabs so long
// values would overflow into adjacent form content without wrapText.
var DC144_WRAP_HEADER_FIELDS = {
  contractId: true,
  contractor: true
};

// Header fields that often contain wide user prose. shrinkToFit prevents
// long text from clipping or pushing into adjacent cells.
// Weather condition/temp fields are included so longer entries like
// "Partly Cloudy with Showers" do not push the template's underline
// rules out of alignment.
// shrinkToFit is only applied to compact cells where overflow would push
// the template's printed underline rules out of position (weather cells,
// item description).  The wide merged header cells (project name, contract,
// contractor, inspector name) must NOT use shrink — ExcelJS mis-calculates
// merged-cell widths and makes the text unreadably tiny.
var DC144_SHRINK_HEADER_FIELDS = {
  itemDescription: true,
  weatherAMCond:   true,
  weatherAMHigh:   true,
  weatherAMLow:    true,
  weatherPMCond:   true,
  weatherPMHigh:   true,
  weatherPMLow:    true
};

// Weather condition fields are typed text and need horizontal:center to
// keep them visually centered on the official form's underline rule.
// Temperature fields stay with the template's native alignment.
var DC144_CENTER_HEADER_FIELDS = {
  weatherAMCond: true,
  weatherAMHigh: true,
  weatherAMLow:  true,
  weatherPMCond: true,
  weatherPMHigh: true,
  weatherPMLow:  true
};

// Convert a stored YYYY-MM-DD date string to MM/DD/YYYY for the Excel cell.
// Used only at export time — the session always stores ISO format internally.
function formatDateForExport(val) {
  if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(String(val))) return val;
  var p = String(val).split('-');
  return p[1] + '/' + p[2] + '/' + p[0];
}

function patchHeaderFields(ws, session) {
  var map = DC144_CELL_MAP[session.tab].header;
  var h   = session.header;
  Object.keys(map).forEach(function(f) {
    // Skip undefined or blank values — an empty write would erase the
    // template's printed label/underline text for that field.
    if (h[f] === undefined || h[f] === null || h[f] === '') return;
    var rawVal       = (f === 'date') ? formatDateForExport(h[f]) : h[f];
    var needsShrink  = !!DC144_SHRINK_HEADER_FIELDS[f];
    var needsCenter  = !!DC144_CENTER_HEADER_FIELDS[f];
    var needsBottom  = !!DC144_BOTTOM_ALIGN_HEADER_FIELDS[f];
    var needsWrap    = !!DC144_WRAP_HEADER_FIELDS[f];
    if (needsShrink || needsCenter || needsBottom || needsWrap) {
      setCellValueReadable(ws, map[f].r, map[f].c, rawVal, {
        shrink: needsShrink,
        center: needsCenter,
        middle: needsCenter,
        bottom: needsBottom,
        wrap:   needsWrap
      });
    } else {
      setCellValue(ws, map[f].r, map[f].c, rawVal);
    }
  });
}

// Data-table column header rows per tab. Tabs C and D have two-row headers.
var DC144_COLUMN_HEADER_ROWS = { a: [15], b: [14], c: [18, 19], d: [17, 18] };

// Force vertical-middle on the column header row(s) so labels don't sit
// pinned to the bottom of a tall header cell.
function patchColumnHeaders(ws, tab) {
  var rows = DC144_COLUMN_HEADER_ROWS[tab] || [];
  rows.forEach(function(r) {
    ws.getRow(r).eachCell({ includeEmpty: false }, function(cell) {
      var ex = cell.alignment || {};
      cell.alignment = {
        horizontal:  ex.horizontal,
        vertical:    'middle',
        wrapText:    ex.wrapText,
        shrinkToFit: ex.shrinkToFit,
        indent:      ex.indent
      };
    });
  });
}

function patchItemHeader(ws, session) {
  if (session.tab === 'a' || !session.itemHeader) return;
  var map = DC144_CELL_MAP[session.tab].header;
  var ih  = session.itemHeader;
  if (map.itemNumber)      setCellValue(ws, map.itemNumber.r, map.itemNumber.c, ih.itemNumber);
  if (map.itemDescription) setCellValueReadable(ws, map.itemDescription.r, map.itemDescription.c, ih.description, { shrink: true });
  if (map.itemCode)        setCellValue(ws, map.itemCode.r, map.itemCode.c, ih.itemCode);
}

function patchDataRows(ws, session) {
  var tab = session.tab;
  var s   = session.section;

  if (tab === 'a') {
    var piMap          = DC144_CELL_MAP.a.payItems;
    // Long-text item-row fields get shrinkToFit so wide user text stays on its row.
    var shrinkFields   = { description: true, location: true, subcontractor: true };
    (s.payItems || []).slice(0, piMap.maxRows).forEach(function(row) {
      var excelRow = piMap.baseRow + row.rowIndex;
      // Write non-qty fields
      ['itemNo','description','itemCode','planPageNum','location','subcontractor'].forEach(function(field) {
        if (!piMap.cols[field]) return;
        if (shrinkFields[field]) {
          setCellValueReadable(ws, excelRow, piMap.cols[field], row[field] || '', { shrink: true });
        } else {
          setCellValue(ws, excelRow, piMap.cols[field], row[field] || '');
        }
      });
      // Qty + unit concatenation. Never write the literal word "custom" —
      // when unit === 'custom' but customUnit is empty, export qty alone.
      var formatQty = function(qtyVal, unitVal, customVal) {
        var q = String(qtyVal || '').trim();
        if (!q) return '';
        var u = getResolvedUnit(unitVal, customVal);
        return u ? q + ' ' + u : q;
      };
      setCellValueReadable(ws, excelRow, piMap.cols.placedQty,  formatQty(row.placedQty,  row.placedQtyUnit,  row.placedQtyUnitCustom), { shrink: true });
      setCellValueReadable(ws, excelRow, piMap.cols.asBuiltQty, formatQty(row.asBuiltQty, row.asBuiltQtyUnit, row.asBuiltQtyUnitCustom), { shrink: true });
    });
  }

  if (tab === 'b') {
    var hmaMap         = DC144_CELL_MAP.b.hmaPavingRows;
    var protectedRows  = hmaMap.formulaProtectedRows || [];
    (s.hmaPavingRows || []).slice(0, hmaMap.maxRows).forEach(function(row) {
      var excelRow = hmaMap.baseRow + row.rowIndex;
      if (protectedRows.indexOf(excelRow) !== -1) return;
      Object.keys(hmaMap.cols).forEach(function(field) {
        setCellValue(ws, excelRow, hmaMap.cols[field], row[field]);
      });
    });
  }

  if (tab === 'c') {
    var appMap = DC144_CELL_MAP.c.applicationRows;
    (s.applicationRows || []).slice(0, appMap.maxRows).forEach(function(row) {
      var excelRow = appMap.baseRow + row.rowIndex;
      Object.keys(appMap.cols).forEach(function(field) {
        setCellValue(ws, excelRow, appMap.cols[field], row[field]);
      });
    });
  }

  if (tab === 'd') {
    var pileMap = DC144_CELL_MAP.d.pileRows;
    (s.pileRows || []).slice(0, pileMap.maxRows).forEach(function(row) {
      var excelRow = pileMap.baseRow + row.rowIndex;
      Object.keys(pileMap.cols).forEach(function(field) {
        setCellValue(ws, excelRow, pileMap.cols[field], row[field]);
      });
    });
  }
}

function patchRemarksFields(ws, session) {
  var tab = session.tab;
  var s   = session.section;

  function buildRemarksText(text, sectionKey) {
    var photosForSection = (session.photos || []).filter(function(p) {
      return p.sectionKey === sectionKey;
    });
    var cleanText = String(text || '').replace(/\s+$/, '');
    if (!photosForSection.length) return cleanText;
    var nums = compactPhotoNumbers(photosForSection.map(function(p) { return p.photoIndex; }));
    var ref  = nums ? '[See Appendix: Photos ' + nums + ']' : '[See Appendix]';
    return cleanText ? cleanText + ' ' + ref : ref;
  }

  // Remarks/observations cells: wrap text + top-align so long user prose
  // stays inside its cell band without overflowing.
  var wrapOpts = { wrap: true, top: true };

  if (tab === 'a') {
    var rm = DC144_CELL_MAP.a.remarks;
    setCellValueReadable(ws, rm.environmental.r,    rm.environmental.c,    buildRemarksText(s.remarks.environmental, 'environmental'), wrapOpts);
    setCellValueReadable(ws, rm.trafficControl.r,   rm.trafficControl.c,   buildRemarksText(s.remarks.trafficControl, 'trafficControl'), wrapOpts);
    setCellValueReadable(ws, rm.workObservations.r, rm.workObservations.c, buildRemarksText(s.remarks.workObservations, 'workObservations'), wrapOpts);
  }
  if (tab === 'b') {
    var wobB = DC144_CELL_MAP.b.workObservations;
    setCellValueReadable(ws, wobB.r, wobB.c, buildRemarksText(s.workObservations, 'workObservations'), wrapOpts);
  }
  if (tab === 'c') {
    var wobC  = DC144_CELL_MAP.c.workObservations;
    var stMap = DC144_CELL_MAP.c.specifiedTempRange;
    var srMap = DC144_CELL_MAP.c.specifiedRateOfApplication;
    setCellValueReadable(ws, wobC.r,  wobC.c,  buildRemarksText(s.workObservations, 'workObservations'), wrapOpts);
    setCellValue(ws, stMap.r, stMap.c, s.specifiedTempRange);
    setCellValue(ws, srMap.r, srMap.c, s.specifiedRateOfApplication);
  }
  if (tab === 'd') {
    var wobD = DC144_CELL_MAP.d.workObservations;
    setCellValueReadable(ws, wobD.r, wobD.c, buildRemarksText(s.workObservations, 'workObservations'), wrapOpts);
  }
}

function patchWorkHours(ws, session) {
  var s   = session.section;
  var map = DC144_CELL_MAP.a.workHours;
  // All labor categories (RE through Loaned off Project) should have their
  // Regular Hrs / Overtime Hrs values centered to match the template's
  // ruled-line grid. The template's default for these cells in some
  // converted xlsx files is left/general — explicitly center every row.
  WORK_HOURS_CATEGORIES.forEach(function(cat) {
    var vals = (s.workHours && s.workHours[cat.key]) || {};
    setCellValueReadable(ws, cat.excelRow, map.regularCol,  vals.regular  || '', { center: true, middle: true });
    setCellValueReadable(ws, cat.excelRow, map.overtimeCol, vals.overtime || '', { center: true, middle: true });
  });
}

function patchTemperature(ws, session) {
  var t   = (session.section && session.section.temperature) || {};
  var map = DC144_CELL_MAP.b.temperature;
  setCellValue(ws, map.producer.r, map.producer.c, t.producer || '');
  var m1 = t.mix1 || {}, m2 = t.mix2 || {};
  setCellValue(ws, map.mix1.mixNo.r,    map.mix1.mixNo.c,    m1.mixNo    || '');
  setCellValue(ws, map.mix1.highestF.r, map.mix1.highestF.c, m1.highestF || '');
  setCellValue(ws, map.mix1.lowestF.r,  map.mix1.lowestF.c,  m1.lowestF  || '');
  setCellValue(ws, map.mix1.avgF.r,     map.mix1.avgF.c,     m1.avgF     || '');
  setCellValue(ws, map.mix2.mixNo.r,    map.mix2.mixNo.c,    m2.mixNo    || '');
  setCellValue(ws, map.mix2.highestF.r, map.mix2.highestF.c, m2.highestF || '');
  setCellValue(ws, map.mix2.lowestF.r,  map.mix2.lowestF.c,  m2.lowestF  || '');
  setCellValue(ws, map.mix2.avgF.r,     map.mix2.avgF.c,     m2.avgF     || '');
}

function patchMaterialInfo(ws, session) {
  var mi  = (session.section && session.section.materialInfo) || {};
  var map = DC144_CELL_MAP.c.materialInfo;
  setCellValue(ws, map.gradeOfMaterial.r,  map.gradeOfMaterial.c,  mi.gradeOfMaterial  || '');
  setCellValue(ws, map.producerLocation.r, map.producerLocation.c, mi.producerLocation || '');
  setCellValue(ws, map.haulerLocation.r,   map.haulerLocation.c,   mi.haulerLocation   || '');
}

function patchPileDescriptor(ws, session) {
  var pd  = (session.section && session.section.pileDescriptor) || {};
  var map = DC144_CELL_MAP.d.pileDescriptor;
  setCellValue(ws, map.structure.r,  map.structure.c,  pd.structure  || '');
  setCellValue(ws, map.location.r,   map.location.c,   pd.location   || '');
  setCellValue(ws, map.typeHammer.r, map.typeHammer.c, pd.typeHammer || '');
}

/* ── Photo appendix helpers ──────────────────────────────────── */
function getFriendlySectionLabel(sectionKey) {
  var labels = {
    environmental:    'Environmental Remarks',
    trafficControl:   'Traffic Control Safety Remarks',
    workObservations: 'Work Observations',
    appendixOnly:     'General Appendix'
  };
  return labels[sectionKey] || (sectionKey || 'Appendix');
}

function formatDateTime(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch(e) { return iso.slice(0, 16).replace('T', ' '); }
}

function getDisplayImageSize(photo) {
  // Column A is 60 char-width units. At ~7px/char that is ≈420 display px.
  var DISPLAY_W = 420;
  var MIN_H     = 80;
  var MAX_H     = 380;
  if (photo.widthPx && photo.heightPx && photo.widthPx > 0) {
    var h = Math.round(DISPLAY_W * photo.heightPx / photo.widthPx);
    h = Math.max(MIN_H, Math.min(MAX_H, h));
    return { width: DISPLAY_W, height: h };
  }
  return { width: DISPLAY_W, height: 280 };
}

/* ── Photo Appendix sheet ────────────────────────────────────── */
function appendPhotoSheet(wb, photos) {
  if (!photos || !photos.length) return;

  var existing = wb.getWorksheet('Photo Appendix');
  if (existing) wb.removeWorksheet(existing.id);

  var ws = wb.addWorksheet('Photo Appendix');

  ws.getColumn(1).width = 60; // ≈420 display px
  ws.getColumn(2).width = 40; // metadata overflow

  var CAPTION_H = 36; // pts — title row
  var META_H    = 18; // pts — section/timestamp row
  var SPACER_H  = 10; // pts — gap between photos

  var currentRow = 1; // 1-based

  photos.forEach(function(photo) {
    // ── Row 1: title (Photo N — caption) ─────────────────────
    var captionRow  = ws.getRow(currentRow);
    captionRow.height = CAPTION_H;
    var captionCell = captionRow.getCell(1);
    captionCell.value = 'Photo ' + photo.photoIndex + (photo.caption ? ' — ' + photo.caption : '');
    captionCell.font      = { bold: true, size: 12, color: { argb: 'FF1e2939' } };
    captionCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6E3' } };
    captionCell.alignment = { vertical: 'middle', wrapText: true };

    // ── Row 2: metadata (section · timestamp) ─────────────────
    var metaRow  = ws.getRow(currentRow + 1);
    metaRow.height = META_H;
    var metaCell = metaRow.getCell(1);
    metaCell.value = getFriendlySectionLabel(photo.sectionKey || '') +
                     (photo.capturedAt ? ' · ' + formatDateTime(photo.capturedAt) : '');
    metaCell.font      = { size: 9, italic: true, color: { argb: 'FF6b7280' } };
    metaCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6E3' } };
    metaCell.alignment = { vertical: 'middle' };

    // ── Row 3: image ──────────────────────────────────────────
    var size       = getDisplayImageSize(photo);
    var imageRowN  = currentRow + 2; // 1-based
    var imageRow   = ws.getRow(imageRowN);
    // 1 px ≈ 0.75 pts
    imageRow.height = Math.max(60, Math.round(size.height * 0.75));

    try {
      var base64Data = photo.base64.replace(/^data:image\/\w+;base64,/, '');
      var imgExt     = photo.base64.indexOf('data:image/png') === 0 ? 'png' : 'jpeg';
      var imageId    = wb.addImage({ base64: base64Data, extension: imgExt });
      // tl uses 0-based row/col; imageRowN is 1-based so tl.row = imageRowN - 1
      ws.addImage(imageId, {
        tl:     { col: 0, row: imageRowN - 1 },
        ext:    { width: size.width, height: size.height },
        editAs: 'oneCell'
      });
    } catch(imgErr) {
      imageRow.getCell(1).value = '[Image: ' + (photo.originalName || 'photo') + ']';
    }

    // ── Row 4: spacer ─────────────────────────────────────────
    ws.getRow(currentRow + 3).height = SPACER_H;
    currentRow += 4;
  });
}

/* ── Photo appendix sanity check ─────────────────────────────── */
function assertPhotoAppendixPreserved(wb, session) {
  var photos = (session && session.photos) || [];
  if (!photos.length) return;

  var ws = wb.getWorksheet('Photo Appendix');
  if (!ws) {
    throw new Error('Photo Appendix worksheet missing after export build (' + photos.length + ' photos were in session).');
  }

  var images = (typeof ws.getImages === 'function') ? (ws.getImages() || []) : [];
  if (images.length < photos.length) {
    throw new Error(
      'Photo Appendix has ' + images.length + ' image(s) but session has ' + photos.length +
      ' photo(s). Some photos may not have exported correctly.'
    );
  }

  var firstCaption = ws.getCell(1, 1).value;
  if (!firstCaption) {
    throw new Error('Photo Appendix caption cell A1 is blank — appendix may not have rendered.');
  }
}

/* ── Download helper ─────────────────────────────────────────── */
function triggerDownload(buffer, filename) {
  var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
}

/* ============================================================
   23. UTILITY HELPERS
   ============================================================ */

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeCard(title, iconSvg) {
  var card = document.createElement('div');
  card.className = 'section-card';
  card.innerHTML =
    '<div class="section-card-header">' +
      '<span class="section-card-icon" style="color:var(--accent);" aria-hidden="true">' + (iconSvg||'') + '</span>' +
      '<span class="section-card-title">' + title + '</span>' +
    '</div>' +
    '<div class="section-card-body"></div>';
  return card;
}

function fieldHtml(key, label, value, type, extraClass) {
  var inputType = type || 'text';
  var cls       = extraClass || '';
  return '<div data-field="' + key + '" class="' + cls + '">' +
    '<label class="field-label" for="field-' + key + '">' + label + '</label>' +
    '<input id="field-' + key + '" class="field-input" type="' + inputType + '" ' +
    'data-field="' + key + '" value="' + esc(value || '') + '" ' +
    'placeholder="' + label + '" aria-label="' + label + '">' +
  '</div>';
}

/* ============================================================
   24. SMART TOPBAR HIDE/REVEAL ON SCROLL
   ============================================================ */

function updateActionbarTop(isTopbarHidden) {
  var actionbar = document.getElementById('form-actionbar');
  if (!actionbar) return;
  actionbar.style.top = isTopbarHidden ? '0px' : 'var(--topbar-h)';
  var progressBar = document.getElementById('form-progress-bar');
  if (progressBar) {
    var base = isTopbarHidden ? 0 : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h'), 10) || 58);
    progressBar.style.top = (base + actionbar.offsetHeight) + 'px';
  }
}

function initSmartHeader() {
  var topbar = document.getElementById('topbar');
  if (!topbar) return;
  var lastScrollY = 0, lastDir = 'up', mouseOverHeader = false, hideTimeout = null;

  function revealTopbar() {
    topbar.classList.remove('header-hidden');
    updateActionbarTop(false);
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  function hideTopbar() {
    topbar.classList.add('header-hidden');
    updateActionbarTop(true);
  }

  topbar.addEventListener('mouseenter', function() {
    mouseOverHeader = true;
    revealTopbar();
  });
  topbar.addEventListener('mouseleave', function() { mouseOverHeader = false; });

  document.addEventListener('scroll', function() {
    var sy  = window.scrollY;
    var dir = sy > lastScrollY ? 'down' : 'up';
    if (dir === 'up') {
      revealTopbar();
    } else if (dir === 'down' && sy > 80 && !mouseOverHeader && !hideTimeout) {
      hideTimeout = setTimeout(function() {
        if (lastDir === 'down' && !mouseOverHeader) hideTopbar();
        hideTimeout = null;
      }, 1000);
    }
    lastDir    = dir;
    lastScrollY = sy;
  }, { passive: true });

  var zone = document.querySelector('.header-hover-zone');
  if (zone) {
    zone.addEventListener('mouseenter', function() { revealTopbar(); });
  }

  document.addEventListener('touchmove', function(e) {
    if (!topbar.classList.contains('header-hidden')) return;
    var t = e.touches[0];
    if (t && t.clientY <= 30) revealTopbar();
  }, { passive: true });
}

/* ============================================================
   24a. MOBILE SECTION PROGRESS TRACKER
   Sticky dot/step strip below the form actionbar (mobile widths only,
   see the max-width:720px CSS block). Rebuilt each time showForm() opens
   a report; scroll-spies the .section-card elements already produced by
   renderForm() so it needs no changes to how sections are rendered.
   ============================================================ */
var _progressObserver = null;
function initFormProgressTracker() {
  var dotsEl  = document.getElementById('form-progress-dots');
  var labelEl = document.getElementById('form-progress-label');
  if (!dotsEl || !labelEl) return;

  if (_progressObserver) { _progressObserver.disconnect(); _progressObserver = null; }

  var sections = Array.prototype.slice.call(document.querySelectorAll('#form-content .section-card'));
  dotsEl.innerHTML = '';
  if (!sections.length) { labelEl.textContent = ''; return; }

  var titles = sections.map(function(card) {
    var t = card.querySelector('.section-card-title');
    return t ? t.textContent : '';
  });

  sections.forEach(function(card, i) {
    var dot = document.createElement('span');
    dot.className = 'form-progress-dot';
    dotsEl.appendChild(dot);
    card.dataset.progressIndex = String(i);
  });

  function setActive(i) {
    var dots = dotsEl.children;
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle('active', j === i);
      dots[j].classList.toggle('done', j < i);
    }
    labelEl.textContent = (i + 1) + ' of ' + sections.length + ' · ' + titles[i];
  }
  setActive(0);

  // Track whichever section sits closest to the top of the actionbar's
  // sticky band; a small negative top margin biases toward the section
  // that has just scrolled under the sticky bar rather than the one still
  // mostly below the fold.
  var actionbar = document.getElementById('form-actionbar');
  var bandHeight = (actionbar ? actionbar.offsetHeight : 0) + 40;
  _progressObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var i = Number(entry.target.dataset.progressIndex);
      if (!isNaN(i)) setActive(i);
    });
  }, { rootMargin: '-' + bandHeight + 'px 0px -70% 0px', threshold: 0 });
  sections.forEach(function(card) { _progressObserver.observe(card); });
}

/* ============================================================
   25. TOPBAR DROPDOWN PANELS — DRAFTS & TEMPLATES
   ============================================================ */

/* Transient panel state — not persisted, reset on close */
var draftsPanel = { open: false };
var templatesPanel = { open: false, chip: 'all', query: '', showMore: {} };

/* ── Drafts panel ─────────────────────────────────────────── */

function openDraftsPanel() {
  closeTemplatesPanel();
  renderDraftsPanel();
  var overlay = document.getElementById('drafts-panel-overlay');
  var btn     = document.getElementById('topbar-drafts-btn');
  if (overlay) {
    trapFocusOpen(overlay);
    overlay.classList.add('open');
    requestAnimationFrame(function() { try { overlay.focus(); } catch (e) {} });
  }
  if (btn)     { btn.classList.add('panel-active'); btn.setAttribute('aria-expanded', 'true'); }
  draftsPanel.open = true;
}

function closeDraftsPanel() {
  var overlay = document.getElementById('drafts-panel-overlay');
  var btn     = document.getElementById('topbar-drafts-btn');
  if (overlay) { overlay.classList.remove('open'); trapFocusClose(overlay); }
  if (btn)     { btn.classList.remove('panel-active'); btn.setAttribute('aria-expanded', 'false'); }
  draftsPanel.open = false;
}

function toggleDraftsPanel() {
  if (draftsPanel.open) { closeDraftsPanel(); } else { openDraftsPanel(); }
}

function renderDraftsPanel() {
  var body      = document.getElementById('drafts-panel-body');
  var countBadge = document.getElementById('drafts-panel-count');
  if (!body) return;
  var arr = loadRecent();
  if (countBadge) countBadge.textContent = arr.length;
  if (!arr.length) {
    body.innerHTML = '<span class="dc144-panel-empty">No recent drafts yet.<br>Start a new report from the dashboard.</span>';
    return;
  }
  body.innerHTML = '';
  arr.forEach(function(rec) {
    var meta = TAB_META[rec.tab] || TAB_META['a'];
    var rowEl = document.createElement('div');
    rowEl.className = 'dc144-draft-row';
    rowEl.setAttribute('role', 'button');
    rowEl.setAttribute('tabindex', '0');
    rowEl.setAttribute('aria-label', 'Open draft: ' + (rec.projectName || 'Untitled Project'));
    var dateStr = rec.date || (rec.savedAt ? rec.savedAt.slice(0,10) : '');
    var metaParts = [dateStr, rec.contractId].filter(Boolean).join(' · ');
    var rowLabel   = rec.rowCount  === 1 ? '1 row'   : (rec.rowCount  ? rec.rowCount + ' rows'   : '');
    var photoLabel = rec.photoCount === 1 ? '1 photo' : (rec.photoCount ? rec.photoCount + ' photos' : '');
    var badges = [meta.label, rowLabel, photoLabel].filter(Boolean).map(function(b) {
      return '<span class="dc144-draft-badge">' + esc(b) + '</span>';
    }).join('');
    rowEl.innerHTML =
      '<div class="dc144-draft-tab-badge" style="background:' + meta.colorBg + ';color:' + meta.color + ';">' + esc(rec.tab.toUpperCase()) + '</div>' +
      '<div class="dc144-draft-info">' +
        '<div class="dc144-draft-project">' + esc(rec.projectName || 'Untitled Project') + '</div>' +
        (metaParts ? '<div class="dc144-draft-meta">' + esc(metaParts) + '</div>' : '') +
        (badges ? '<div class="dc144-draft-badges">' + badges + '</div>' : '') +
      '</div>' +
      '<button class="dc144-row-del-btn" aria-label="Delete ' + esc(rec.projectName || 'draft') + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>';
    rowEl.addEventListener('click', function() {
      openDraftFromPanel(rec);
    });
    rowEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDraftFromPanel(rec); }
    });
    rowEl.querySelector('.dc144-row-del-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      deleteDraftFromPanel(rec.photoKey);
    });
    body.appendChild(rowEl);
  });
}

function openDraftFromPanel(rec) {
  if (!currentSession) {
    closeDraftsPanel();
    restoreSession(rec.photoKey, rec.tab);
    return;
  }
  // Active form session — save silently first, then open
  saveCurrentSessionNow({ silent: true }).then(function() {
    closeDraftsPanel();
    restoreSession(rec.photoKey, rec.tab);
  }).catch(function() {
    showToast('Could not save current draft — open cancelled', 'err');
  });
}

function deleteDraftFromPanel(photoKey) {
  if (!confirm('Delete this draft permanently? This cannot be undone.')) return;
  dbDeleteDC144(photoKey);
  var arr = loadRecent().filter(function(r) { return r.photoKey !== photoKey; });
  saveRecent(arr);
  renderDraftsPanel();
  renderRecentChips();
  showToast('Draft deleted', 'info', 1800);
}

/* ── Templates panel ──────────────────────────────────────── */

function openTemplatesPanel() {
  closeDraftsPanel();
  templatesPanel.chip     = 'all';
  templatesPanel.query    = '';
  templatesPanel.showMore = {};
  var searchEl = document.getElementById('templates-panel-search');
  if (searchEl) searchEl.value = '';
  renderTemplatesPanel();
  var overlay = document.getElementById('templates-panel-overlay');
  var btn     = document.getElementById('topbar-templates-btn');
  if (overlay) { trapFocusOpen(overlay); overlay.classList.add('open'); }
  if (btn)     { btn.classList.add('panel-active'); btn.setAttribute('aria-expanded', 'true'); }
  templatesPanel.open = true;
  // Focus search after panel opens
  requestAnimationFrame(function() {
    var search = document.getElementById('templates-panel-search');
    if (search) search.focus();
  });
}

function closeTemplatesPanel() {
  var overlay = document.getElementById('templates-panel-overlay');
  var btn     = document.getElementById('topbar-templates-btn');
  if (overlay) { overlay.classList.remove('open'); trapFocusClose(overlay); }
  if (btn)     { btn.classList.remove('panel-active'); btn.setAttribute('aria-expanded', 'false'); }
  templatesPanel.open = false;
}

function toggleTemplatesPanel() {
  if (templatesPanel.open) { closeTemplatesPanel(); } else { openTemplatesPanel(); }
}

/* Filter helper — applies chip + search query to the full template list */
function getFilteredTemplates(chip, query) {
  var arr = loadTemplates();
  if (chip && chip !== 'all') {
    arr = arr.filter(function(t) { return t.tab === chip; });
  }
  if (query && query.trim()) {
    var q = query.trim().toLowerCase();
    arr = arr.filter(function(t) {
      var tabName = (TAB_META[t.tab] && TAB_META[t.tab].name) || '';
      return (t.name                                    || '').toLowerCase().indexOf(q) >= 0 ||
             ((t.header && t.header.projectName)        || '').toLowerCase().indexOf(q) >= 0 ||
             ((t.header && t.header.contractId)         || '').toLowerCase().indexOf(q) >= 0 ||
             ((t.header && t.header.inspectorName)      || '').toLowerCase().indexOf(q) >= 0 ||
             tabName.toLowerCase().indexOf(q) >= 0 ||
             (t.tab                                     || '').toLowerCase().indexOf(q) >= 0;
    });
  }
  return arr;
}

function renderTemplatesPanel() {
  var body       = document.getElementById('templates-panel-body');
  var countBadge = document.getElementById('templates-panel-count');
  var chipsEl    = document.getElementById('templates-filter-chips');
  if (!body) return;

  var allTemplates    = loadTemplates();
  var activeChip      = templatesPanel.chip || 'all';
  var activeQuery     = templatesPanel.query || '';
  var isFiltered      = activeChip !== 'all' || activeQuery.trim().length > 0;
  var filtered        = getFilteredTemplates(activeChip, activeQuery);

  if (countBadge) countBadge.textContent = allTemplates.length;

  /* Build filter chips — show only tabs that exist in the full unfiltered list */
  if (chipsEl) {
    var presentTabs = [];
    ['a','b','c','d'].forEach(function(tab) {
      if (allTemplates.some(function(t) { return t.tab === tab; })) presentTabs.push(tab);
    });
    chipsEl.innerHTML = '';
    var chips = ['all'].concat(presentTabs.length > 1 ? presentTabs : []);
    chips.forEach(function(chipId) {
      var btn = document.createElement('button');
      var isAll = chipId === 'all';
      var label = isAll ? 'All' : chipId.toUpperCase();
      btn.className = 'dc144-filter-chip' +
        (isAll ? '' : ' dc144-chip-' + chipId) +
        (activeChip === chipId ? ' dc144-chip-active' : '');
      btn.textContent = label;
      btn.addEventListener('click', function() {
        templatesPanel.chip = chipId;
        templatesPanel.showMore = {};
        renderTemplatesPanel();
        var searchInput = document.getElementById('templates-panel-search');
        if (searchInput) searchInput.focus();
      });
      chipsEl.appendChild(btn);
    });
  }

  body.innerHTML = '';

  if (!allTemplates.length) {
    body.innerHTML = '<span class="dc144-panel-empty">No templates yet.<br>Fill in a header inside a form, then tap "Template" to save one.</span>';
    return;
  }
  if (!filtered.length) {
    body.innerHTML = '<span class="dc144-panel-empty">No templates match your search.</span>';
    return;
  }

  if (isFiltered) {
    /* Flat list — show all matches when search or chip is active */
    filtered.forEach(function(tpl) {
      body.appendChild(buildTemplatePanelRow(tpl));
    });
  } else {
    /* Grouped list — A → B → C → D → Other, first 3 per group + show-more */
    var GROUPS = ['a', 'b', 'c', 'd'];
    GROUPS.forEach(function(tab) {
      var group = filtered.filter(function(t) { return t.tab === tab; });
      if (!group.length) return;
      var meta = TAB_META[tab];
      /* Group header */
      var hdr = document.createElement('div');
      hdr.className = 'dc144-group-header';
      hdr.innerHTML =
        '<span class="dc144-group-dot" style="background:' + meta.color + ';"></span>' +
        esc(tab.toUpperCase() + ' — ' + meta.name);
      body.appendChild(hdr);
      /* Rows — first 3 visible, rest hidden unless showMore[tab] is true */
      var showAll = !!(templatesPanel.showMore && templatesPanel.showMore[tab]);
      var visible = showAll ? group : group.slice(0, 3);
      visible.forEach(function(tpl) {
        body.appendChild(buildTemplatePanelRow(tpl));
      });
      /* Show more / show fewer button */
      if (group.length > 3) {
        var moreBtn = document.createElement('button');
        moreBtn.className = 'dc144-show-more-btn';
        moreBtn.textContent = showAll
          ? 'Show fewer ' + tab.toUpperCase() + ' templates'
          : 'Show ' + (group.length - 3) + ' more ' + tab.toUpperCase() + ' template' + (group.length - 3 !== 1 ? 's' : '');
        moreBtn.addEventListener('click', function() {
          templatesPanel.showMore = templatesPanel.showMore || {};
          templatesPanel.showMore[tab] = !showAll;
          renderTemplatesPanel();
        });
        body.appendChild(moreBtn);
      }
    });
    /* Legacy templates (no tab / unrecognized tab) — shown in an "Other" group */
    var otherGroup = filtered.filter(function(t) { return !t.tab || !TAB_META[t.tab]; });
    if (otherGroup.length) {
      var otherHdr = document.createElement('div');
      otherHdr.className = 'dc144-group-header';
      otherHdr.innerHTML = '<span class="dc144-group-dot" style="background:#6b7280;"></span>Other (legacy)';
      body.appendChild(otherHdr);
      var otherShowAll = !!(templatesPanel.showMore && templatesPanel.showMore['other']);
      var otherVisible = otherShowAll ? otherGroup : otherGroup.slice(0, 3);
      otherVisible.forEach(function(tpl) {
        body.appendChild(buildTemplatePanelRow(tpl));
      });
      if (otherGroup.length > 3) {
        var otherMoreBtn = document.createElement('button');
        otherMoreBtn.className = 'dc144-show-more-btn';
        otherMoreBtn.textContent = otherShowAll
          ? 'Show fewer Other templates'
          : 'Show ' + (otherGroup.length - 3) + ' more Other template' + (otherGroup.length - 3 !== 1 ? 's' : '');
        otherMoreBtn.addEventListener('click', function() {
          templatesPanel.showMore = templatesPanel.showMore || {};
          templatesPanel.showMore['other'] = !otherShowAll;
          renderTemplatesPanel();
        });
        body.appendChild(otherMoreBtn);
      }
    }
  }
}

function buildTemplatePanelRow(tpl) {
  var meta = TAB_META[tpl.tab] || TAB_META['a'];
  var rowEl = document.createElement('div');
  rowEl.className = 'dc144-tpl-row';
  rowEl.setAttribute('role', 'button');
  rowEl.setAttribute('tabindex', '0');
  rowEl.setAttribute('aria-label', 'Load template: ' + (tpl.name || 'Untitled'));
  var dateStr  = tpl.createdAt ? tpl.createdAt.slice(0, 10) : '';
  var metaParts = [tpl.header && tpl.header.projectName, tpl.header && tpl.header.contractId, dateStr].filter(Boolean).join(' · ');
  rowEl.innerHTML =
    '<div class="dc144-tpl-tab-badge" style="background:' + meta.colorBg + ';color:' + meta.color + ';">' + esc((tpl.tab || '?').toUpperCase()) + '</div>' +
    '<div class="dc144-tpl-info">' +
      '<div class="dc144-tpl-name">' + esc(tpl.name) + '</div>' +
      (metaParts ? '<div class="dc144-tpl-meta">' + esc(metaParts) + '</div>' : '') +
    '</div>' +
    '<button class="dc144-row-del-btn" aria-label="Delete template ' + esc(tpl.name) + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>';
  rowEl.addEventListener('click', function() {
    applyTemplateFromPanel(tpl);
  });
  rowEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyTemplateFromPanel(tpl); }
  });
  rowEl.querySelector('.dc144-row-del-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    deleteTemplateFromPanel(tpl.id);
  });
  return rowEl;
}

function applyTemplateFromPanel(tpl) {
  function loadTemplate() {
    // Templates with a known tab go directly to startNewSession — no picker needed.
    // Legacy templates without a tab field fall back to the tab-picker overlay.
    if (tpl.tab && TAB_META[tpl.tab]) {
      startNewSession(tpl.tab, tpl);
    } else {
      showTemplateTabPicker(tpl);
    }
  }

  if (currentSession) {
    if (!confirm('Start a new form from this template? Your current report will be saved first.')) return;
    saveCurrentSessionNow({ silent: true }).then(function() {
      closeTemplatesPanel();
      loadTemplate();
    }).catch(function() {
      showToast('Could not save current draft — template load cancelled', 'err');
    });
  } else {
    closeTemplatesPanel();
    loadTemplate();
  }
}

function deleteTemplateFromPanel(id) {
  if (!confirm('Delete this template? This cannot be undone.')) return;
  var arr = loadTemplates().filter(function(t) { return t.id !== id; });
  if (saveTemplatesArr(arr)) {
    renderTemplatesPanel();
    renderTemplateChips();
    showToast('Template deleted', 'info', 1800);
  } else {
    showToast('Could not delete template — storage error', 'err', 4000);
  }
}

/* Wire search input — live filter as user types */
function initPanelSearch() {
  var searchEl = document.getElementById('templates-panel-search');
  if (!searchEl) return;
  searchEl.addEventListener('input', function() {
    templatesPanel.query = searchEl.value;
    templatesPanel.showMore = {};
    renderTemplatesPanel();
    // Re-focus input since renderTemplatesPanel rebuilds the chips container
    // but the search input is outside that container, so focus is preserved.
  });
  searchEl.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeTemplatesPanel(); }
  });
}

/* Backdrop click closes the respective panel */
function initPanelBackdrops() {
  var draftsOverlay    = document.getElementById('drafts-panel-overlay');
  var templatesOverlay = document.getElementById('templates-panel-overlay');
  if (draftsOverlay) {
    draftsOverlay.addEventListener('click', function(e) {
      if (e.target === draftsOverlay) closeDraftsPanel();
    });
  }
  if (templatesOverlay) {
    templatesOverlay.addEventListener('click', function(e) {
      if (e.target === templatesOverlay) closeTemplatesPanel();
    });
  }
}

/* ============================================================
   26. INITIALISATION
   ============================================================ */

function init() {
  try { localStorage.setItem('ft_last', 'dc144'); } catch(e) {}

  // Wire modal keyboard shortcut (Escape closes whichever is open, panels first)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (draftsPanel.open)    { closeDraftsPanel();    return; }
      if (templatesPanel.open) { closeTemplatesPanel(); return; }
      var sigOpen = document.getElementById('signature-modal');
      if (sigOpen && sigOpen.classList.contains('open')) { closeSignaturePad(); return; }
      closeTemplateModal();
    }
  });

  // Click-outside-to-close for signature modal
  var sigModal = document.getElementById('signature-modal');
  if (sigModal) {
    sigModal.addEventListener('click', function(e) {
      if (e.target === sigModal) closeSignaturePad();
    });
  }

  // Wire photo file input
  var photoInput = document.getElementById('photo-file-input');
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoCaptureEvent);
  }

  // Wire panel search and backdrops
  initPanelSearch();
  initPanelBackdrops();

  initSmartHeader();

  openPhotoDB().catch(function() {
    showToast('Storage unavailable — drafts will not persist', 'err', 4000);
  });

  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
