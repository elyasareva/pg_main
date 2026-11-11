'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

// Bind ke semua interface agar dashboard bisa dibuka dari perangkat lain di
// jaringan yang sama (mis. HP). Untuk pemakaian yang hanya boleh diakses mesin
// sendiri, jalankan dengan HOST=127.0.0.1.
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8787);
const SOURCE_URL = 'https://galeri24.co.id/harga-emas';
const CACHE_TTL_MS = 5 * 60 * 1000;
const ROOT = __dirname;

// Urutan pencarian tiap vendor: id section di halaman resmi dan label tampilan.
const VENDORS = {
  galeri24: { label: 'Galeri 24', sections: ['GALERI 24'] },
  antam: { label: 'Antam', sections: ['ANTAM'] },
  ubs: { label: 'UBS', sections: ['UBS'] },
  lotus: { label: 'Lotus Archi', sections: ['LOTUS ARCHI'] },
};

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let cache = { fetchedAt: 0, vendors: {}, snapshot: null };
let inFlightScrape = null;

function send(res, status, body, method = 'GET', extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  if (method === 'HEAD' || status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(body));
}

function parseRupiah(text) {
  const digits = String(text || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function parseWeight(text) {
  const normalized = String(text || '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return 0;
  const weight = Number(normalized);
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

function pickReference(items) {
  if (!items.length) return { referenceWeight: null, referencePrice: 0 };
  const ref = items.find((item) => item.weight === 1) || items[0];
  return { referenceWeight: ref.weight, referencePrice: ref.price };
}

// Membaca semua baris gramasi valid (berat > 0 dan Harga Jual > 0) pada tabel vendor.
function readVendorItems($, sectionIds) {
  for (const id of sectionIds) {
    const section = $(`[id="${id}"]`).first();
    if (!section.length) continue;

    const byWeight = new Map();
    section.find('.grid-cols-5').each((_, row) => {
      const cells = $(row).children('div');
      if (cells.length < 2) return;
      const weight = parseWeight($(cells[0]).text());
      const price = parseRupiah($(cells[1]).text());
      if (weight > 0 && price > 0 && !byWeight.has(weight)) {
        byWeight.set(weight, { weight, price });
      }
    });

    const items = Array.from(byWeight.values()).sort((a, b) => a.weight - b.weight);
    if (items.length > 0) return items;
  }
  return [];
}

async function scrapePrices() {
  const response = await fetch(SOURCE_URL, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Halaman sumber merespons HTTP ${response.status}`);
  }

  const $ = cheerio.load(await response.text());
  const scraped = {};

  for (const [key, vendor] of Object.entries(VENDORS)) {
    const items = readVendorItems($, vendor.sections);
    if (items.length > 0) scraped[key] = items;
  }

  if (Object.keys(scraped).length === 0) {
    throw new Error('Tidak ada data gramasi vendor yang bisa dibaca dari halaman sumber');
  }

  return scraped;
}

function buildPayload({ vendors, missing, fetchedAt, cached, stale, warning }) {
  let note = 'Daftar gramasi dan harga jual per vendor berhasil dibaca dari halaman resmi Galeri 24.';
  if (warning) {
    note = warning;
  } else if (missing.length) {
    note = `Sebagian vendor (${missing.join(', ')}) tidak ditemukan di halaman sumber; dashboard mempertahankan data terakhir yang tersimpan.`;
  }

  return {
    source: SOURCE_URL,
    fetchedAt,
    vendors,
    missing,
    stale,
    cached,
    ...(warning ? { warning } : {}),
    note,
  };
}

function buildStaleFallbackPayload(warning) {
  const vendors = {};
  const missing = [];

  for (const [key, meta] of Object.entries(VENDORS)) {
    if (cache.vendors[key]) {
      vendors[key] = { ...cache.vendors[key], stale: true };
    } else {
      missing.push(meta.label);
      vendors[key] = {
        label: meta.label,
        fetchedAt: null,
        stale: false,
        referenceWeight: null,
        referencePrice: 0,
        items: [],
      };
    }
  }

  return buildPayload({
    vendors,
    missing,
    fetchedAt: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    cached: true,
    stale: true,
    warning,
  });
}

async function getPrices(forceRefresh) {
  const fresh = cache.snapshot && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (fresh && !forceRefresh) return { ...cache.snapshot, cached: true };

  if (!inFlightScrape) {
    inFlightScrape = (async () => {
      const scraped = await scrapePrices();
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const vendors = {};
      const missing = [];
      let hasPartialStale = false;

      for (const [key, meta] of Object.entries(VENDORS)) {
        const items = scraped[key];
        if (items && items.length > 0) {
          cache.vendors[key] = {
            label: meta.label,
            fetchedAt: nowIso,
            ...pickReference(items),
            items,
          };
          vendors[key] = { ...cache.vendors[key], stale: false };
        } else {
          missing.push(meta.label);
          if (cache.vendors[key]) {
            hasPartialStale = true;
            vendors[key] = { ...cache.vendors[key], stale: true };
          } else {
            vendors[key] = {
              label: meta.label,
              fetchedAt: null,
              stale: false,
              referenceWeight: null,
              referencePrice: 0,
              items: [],
            };
          }
        }
      }

      cache.fetchedAt = nowMs;
      cache.snapshot = buildPayload({
        vendors,
        missing,
        fetchedAt: nowIso,
        cached: false,
        stale: hasPartialStale,
      });

      return cache.snapshot;
    })().finally(() => {
      inFlightScrape = null;
    });
  }

  return inFlightScrape;
}

function resolvePublicAsset(pathname) {
  if (pathname === '/') return 'dashboard_sinkronisasi_galeri24.html';

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const name = decoded.replace(/^\/+/, '');
  if (!name || name.startsWith('.') || name.includes('/') || name.includes('\\') || name.includes('\0')) {
    return null;
  }

  if (name === 'dashboard_sinkronisasi_galeri24.html') return name;
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTS.has(ext) ? name : null;
}

function serveStatic(res, pathname, method = 'GET') {
  const name = resolvePublicAsset(pathname);
  if (!name) return false;

  const filePath = path.resolve(ROOT, name);
  if (!filePath.startsWith(ROOT + path.sep) || !fs.existsSync(filePath)) return false;

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
  });
  if (method === 'HEAD') {
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  if (method === 'OPTIONS') return send(res, 204, {}, method);
  if (method !== 'GET' && method !== 'HEAD') {
    return send(res, 405, { error: 'Method tidak diizinkan' }, method, { Allow: 'GET, HEAD, OPTIONS' });
  }

  try {
    const url = new URL(req.url || '/', 'http://localhost');

    if (url.pathname === '/health') {
      return send(res, 200, {
        status: 'ok',
        proxy: 'galeri24-scraper',
        source: SOURCE_URL,
        endpoint: '/api/gold-prices',
        cachedSince: cache.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
      }, method);
    }

    if (url.pathname === '/api/gold-prices') {
      const force = url.searchParams.get('refresh') === 'true';
      try {
        return send(res, 200, await getPrices(force), method);
      } catch (error) {
        console.error('Gagal mengambil harga:', error.message);
        // Sumber gagal: sajikan harga terakhir yang pernah berhasil, jangan mengarang harga baru.
        if (Object.keys(cache.vendors).length > 0) {
          return send(
            res,
            200,
            buildStaleFallbackPayload(`Gagal memperbarui dari sumber (${error.message}). Menampilkan data terakhir.`),
            method
          );
        }
        return send(res, 502, { error: 'Gagal mengambil harga dari sumber resmi.', detail: error.message }, method);
      }
    }

    if (serveStatic(res, url.pathname, method)) return undefined;

    return send(res, 404, { error: 'Endpoint tidak ditemukan' }, method);
  } catch (error) {
    console.error('Kesalahan tak terduga:', error);
    if (!res.headersSent) {
      return send(res, 500, { error: 'Terjadi kesalahan internal server.' }, method);
    }
    res.end();
    return undefined;
  }
});

server.requestTimeout = 30000;
server.headersTimeout = 15000;

function shutdown(signal) {
  console.log(`Menerima ${signal}, menutup server...`);
  const forceTimer = setTimeout(() => process.exit(1), 5000);
  forceTimer.unref();
  server.close(() => {
    clearTimeout(forceTimer);
    process.exit(0);
  });
  server.closeIdleConnections?.();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log(`Proxy harga Galeri 24 aktif di: http://${HOST}:${PORT}`);
  console.log(`Dashboard: http://${HOST}:${PORT}/`);
});
