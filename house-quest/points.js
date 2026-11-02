/* ============================================================
   House Quest school mode: the house QR code and sending points.

   The QR on each classroom card opens school.html?h=WATER&y=3&c=NNNN.
   The codes are not in any game file: the points script (Zoe's Google
   Apps Script, URL in points-config.js) checks them. This is the only
   file allowed to make a network call, and only to that script.
   ============================================================ */
(function () {
  'use strict';

  var HOUSES = ['FIRE', 'WATER', 'AIR', 'EARTH'];

  /* The house, year and code from the address, or null if any is missing or wrong. */
  function entryFromUrl(search) {
    var p = {};
    String(search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) p[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1)).trim();
    });
    var house = String(p.h || '').toUpperCase(), year = p.y, code = p.c;
    if (HOUSES.indexOf(house) < 0 || !/^[2-6]$/.test(year || '') || !/^\d{4}$/.test(code || '')) return null;
    return { house: house, year: Number(year), code: code };
  }

  function payload(entry, points, gameId) {
    return JSON.stringify({ house: entry.house, year: entry.year, code: entry.code, points: points, gameId: gameId, mode: 'school' });
  }

  /* text/plain keeps it a "simple" request: no CORS preflight, which Apps Script can't answer. */
  function send(url, body) {
    if (!url || typeof fetch !== 'function') return Promise.resolve({ ok: false, reason: 'offline' });
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, reason: 'offline' }; });
  }

  /* The teacher's typed code: which house and year it belongs to, or null. */
  function lookup(url, code) {
    if (!url || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(url + '?code=' + encodeURIComponent(code), { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (o) { return o && HOUSES.indexOf(o.house) >= 0 && o.year >= 2 && o.year <= 6 ? { house: o.house, year: Number(o.year) } : null; })
      .catch(function () { return null; });
  }

  var HQPoints = { entryFromUrl: entryFromUrl, payload: payload, send: send, lookup: lookup };
  if (typeof module !== 'undefined' && module.exports) { module.exports = HQPoints; return; }
  window.HQPoints = HQPoints;
})();
