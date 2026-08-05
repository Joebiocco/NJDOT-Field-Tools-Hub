// Field Tools Hub — 511NJ RSS proxy
// Paste this file into the Cloudflare Worker at:
// https://njdot-511-proxy.joebiocco.workers.dev/

const FEED_URL = 'https://511nj.org/RSS511Service/RSS511Service.svc/rest/rss/RSSAllNJActiveEvents';
const CACHE_SECONDS = 60;
const ALLOWED_ORIGINS = new Set([
  'https://joebiocco.github.io',
  'null', // Local file:// previews use an opaque (null) origin.
]);

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
  });
  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return headers;
}

function jsonResponse(body, status, origin) {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  corsHeaders(origin).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cacheKey(request) {
  const url = new URL(request.url);
  url.pathname = '/__cache/nj-events';
  url.search = '';
  return new Request(url.toString(), { method: 'GET' });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (!isAllowedOrigin(origin)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, '');
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, source: '511NJ', cacheSeconds: CACHE_SECONDS }, 200, origin);
    }

    if (url.pathname !== '/' && url.pathname !== '/rss') {
      return jsonResponse({ error: 'Not found' }, 404, origin);
    }

    const cache = caches.default;
    const key = cacheKey(request);
    let response = await cache.match(key);

    if (!response) {
      const upstream = await fetch(FEED_URL, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      });

      if (!upstream.ok) {
        return jsonResponse({ error: '511NJ feed unavailable', status: upstream.status }, 502, origin);
      }

      const headers = new Headers({
        'Content-Type': upstream.headers.get('Content-Type') || 'application/xml; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
        'X-Proxy-Cache-Seconds': String(CACHE_SECONDS),
        'X-Content-Type-Options': 'nosniff',
      });
      response = new Response(upstream.body, { status: 200, headers });
      ctx.waitUntil(cache.put(key, response.clone()));
    }

    return withCors(response, origin);
  },
};
