#!/usr/bin/env node
// Measures what a client sees: time from sending a request to having the parsed response,
// one request at a time, after a warm-up. Node built-ins only, no dependencies.
//   node api-latency.mjs <baseUrl> <sceneId> [runs=200] [label]
const [base, sceneId, runsArg = '200', label = 'run'] = process.argv.slice(2);
if (!base || !sceneId) {
  console.error('usage: node api-latency.mjs <baseUrl> <sceneId> [runs] [label]');
  process.exit(2);
}
const runs = Number(runsArg);
const WARMUP = 10;
const DEEP_PAGE = 500;
const api = `${base}/api/scenes/${sceneId}/annotations`;

// A seeded generator, so two runs ask the same questions.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = (items) => items[Math.floor(rand() * items.length)];

async function json(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} for ${url}: ${await res.text()}`);
  return res.json();
}

// Realistic places to ask about: the first page of the list is a spread of the whole dataset.
const first = await json(`${api}?limit=200`);
const places = first.items.filter((i) => i.geometry.type === 'Point').map((i) => i.geometry.coordinates);
if (places.length === 0) throw new Error('no points to sample: is the scene seeded?');

const box = ([x, y], dx, dy) => [x - dx, y - dy, x + dx, y + dy];
const ring = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const post = (zone) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ zone: { type: 'Polygon', coordinates: [ring(zone)] }, limit: 200 }),
});

const operations = [
  { name: 'View 250 m wide (bbox)', count: (j) => j.items.length,
    request: (p) => [`${api}?bbox=${box(p, 0.0015, 0.001).join(',')}&limit=200`] },
  { name: 'View 3 km wide (bbox)', count: (j) => j.items.length,
    request: (p) => [`${api}?bbox=${box(p, 0.02, 0.01).join(',')}&limit=200`] },
  { name: '10 nearest', count: (j) => j.length,
    request: ([x, y]) => [`${api}/nearest?longitude=${x}&latitude=${y}&limit=10`] },
  { name: '10 nearest within 200 m', count: (j) => j.length,
    request: ([x, y]) => [`${api}/nearest?longitude=${x}&latitude=${y}&limit=10&maxDistanceMeters=200`] },
  { name: 'Zone 170 m wide (search)', count: (j) => j.items.length,
    request: (p) => [`${api}/search`, post(box(p, 0.001, 0.0008))] },
];

const percentile = (sorted, p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
const fmt = (n) => n.toFixed(1);
const rows = [];

async function measure(name, once) {
  for (let i = 0; i < WARMUP; i++) await once();
  const times = [];
  let items = 0;
  for (let i = 0; i < runs; i++) {
    const started = performance.now();
    items += await once();
    times.push(performance.now() - started);
  }
  times.sort((a, b) => a - b);
  rows.push(`| ${name} | ${runs} | ${fmt(items / runs)} | ${fmt(percentile(times, 50))} | ${fmt(percentile(times, 95))} | ${fmt(percentile(times, 99))} | ${fmt(times.at(-1))} |`);
}

for (const op of operations) {
  await measure(op.name, async () => {
    const [url, init] = op.request(pick(places));
    return op.count(await json(url, init));
  });
}

// Keyset paging: the 500th page costs the same as the first. Walk there once, then time that request.
async function pageUrl(page) {
  let cursor = null;
  for (let p = 1; p < page; p++) {
    const j = await json(`${api}?limit=200${cursor ? `&cursor=${cursor}` : ''}`);
    cursor = j.nextCursor;
    if (!cursor) return { url: null, reached: p };
  }
  return { url: `${api}?limit=200${cursor ? `&cursor=${cursor}` : ''}`, reached: page };
}
const deep = await pageUrl(DEEP_PAGE);
await measure('List, page 1 (200 rows)', async () => (await json(`${api}?limit=200`)).items.length);
if (deep.url) {
  await measure(`List, page ${DEEP_PAGE} (rows ${((DEEP_PAGE - 1) * 200 + 1).toLocaleString('en')} on)`, async () => (await json(deep.url)).items.length);
}

console.log(`### ${label}`);
console.log('');
console.log(`One request at a time, ${WARMUP} warm-up requests discarded, then ${runs} timed. Time is request sent to response parsed.`);
console.log('');
console.log('| Operation | Runs | Avg items | p50 ms | p95 ms | p99 ms | Max ms |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const row of rows) console.log(row);
console.log('');
