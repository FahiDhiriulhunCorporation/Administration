// Invoice reader for the Administration app.
// The browser sends the invoice pages; this server asks Claude to read them and returns the details as JSON.
// The AI key stays on this server and is never sent to the browser.
//
// Run:  ANTHROPIC_API_KEY=sk-... APP_ORIGIN=https://your-app-host READER_TOKEN=some-shared-secret node server.js
// Env:  PORT (8787), CLAUDE_MODEL (claude-sonnet-5-5), ANTHROPIC_BASE_URL (https://api.anthropic.com),
//       APP_ORIGIN (CORS; '*' by default), READER_TOKEN (optional; if set the app must send it in X-Reader-Token)
'use strict';
const http = require('http');

const CFG = () => ({
  key: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
  upstream: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
  origin: process.env.APP_ORIGIN || '*',
  token: process.env.READER_TOKEN || '',
});
const MAX_BODY = 30 * 1024 * 1024;           // 30 MB of JSON (base64 files)
const MAX_FILES = 10;
const PDF = 'application/pdf';
const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const PROMPT = `You are reading a fuel invoice, delivery note or purchase order. Return ONLY a JSON object with these keys:
supplier (string or null), invoiceNumber (string or null), invoiceDate (YYYY-MM-DD or null), deliveryNoteNo (string or null),
poNumber (string or null), fuelType ("Petrol", "Diesel" or null), litres (number or null), ratePerLitre (number or null),
total (number or null: the amount payable), currency (string or null), confidence ("high", "medium" or "low"), notes (string).
Use null for anything that is not on the document. Do not guess. Numbers must be plain numbers without commas or currency symbols.`;

function send(res, code, obj, cfg) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': cfg.origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-Reader-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// the files as Claude content blocks: PDFs as documents, photos as images
function contentFor(files) {
  const blocks = files.map(f => {
    if (!f || typeof f.data !== 'string' || !f.data) throw Object.assign(new Error('a file is empty'), { code: 400 });
    if (f.type === PDF) return { type: 'document', source: { type: 'base64', media_type: PDF, data: f.data } };
    if (IMAGES.includes(f.type)) return { type: 'image', source: { type: 'base64', media_type: f.type, data: f.data } };
    throw Object.assign(new Error('unsupported file type: ' + f.type), { code: 400 });
  });
  blocks.push({ type: 'text', text: PROMPT });
  return blocks;
}

async function readInvoice(files, cfg, fetchImpl) {
  const res = await fetchImpl(cfg.upstream + '/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: cfg.model, max_tokens: 1024, messages: [{ role: 'user', content: contentFor(files) }] }),
  });
  if (!res.ok) throw Object.assign(new Error('the AI service returned ' + res.status), { code: 502 });
  const msg = await res.json();
  const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw Object.assign(new Error('no details could be read from the document'), { code: 422 });
  try { return JSON.parse(m[0]); } catch (e) { throw Object.assign(new Error('the reply could not be read'), { code: 422 }); }
}

function handler(fetchImpl = fetch) {
  return async (req, res) => {
    const cfg = CFG();
    if (req.method === 'OPTIONS') return send(res, 204, {}, cfg);
    if (req.method !== 'POST' || req.url !== '/api/read-invoice') return send(res, 404, { error: 'not found' }, cfg);
    if (cfg.token && req.headers['x-reader-token'] !== cfg.token) return send(res, 401, { error: 'not allowed' }, cfg);
    if (!cfg.key) return send(res, 500, { error: 'the reader is not configured (no API key)' }, cfg);
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      const files = Array.isArray(body.files) ? body.files : [];
      if (!files.length) throw Object.assign(new Error('no files sent'), { code: 400 });
      if (files.length > MAX_FILES) throw Object.assign(new Error('too many files'), { code: 400 });
      const data = await readInvoice(files, cfg, fetchImpl);
      send(res, 200, { data }, cfg);
    } catch (e) {
      send(res, e.code || 500, { error: e.code ? e.message : 'the invoice could not be read' }, cfg);
    }
  };
}

module.exports = { handler, PROMPT };

if (require.main === module) {
  const port = +process.env.PORT || 8787;
  http.createServer(handler()).listen(port, () => console.log('invoice reader listening on port ' + port));
}
