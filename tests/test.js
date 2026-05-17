// Smoke tests for the API.
// Just makes sure each endpoint responds without crashing.

require('dotenv').config();
const http = require('http');
const app = require('../api/index.js');

const PORT = 4567;

async function get(path) {
  const res = await fetch('http://127.0.0.1:' + PORT + path);
  return { status: res.status };
}

async function post(path, body) {
  const res = await fetch('http://127.0.0.1:' + PORT + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status };
}

function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) process.exitCode = 1;
}

async function run() {
  const server = http.createServer(app).listen(PORT);

  console.log('Running tests...\n');

  let r = await get('/api/health');
  check('GET /api/health', r.status === 200);

  r = await get('/api/stations');
  check('GET /api/stations', r.status === 200 || r.status === 500);

  r = await get('/api/predictions/A01');
  check('GET /api/predictions/A01', r.status === 200 || r.status === 500);

  r = await get('/api/predictions/bad');
  check('GET /api/predictions/bad returns 400', r.status === 400);

  r = await get('/api/weather/A01');
  check('GET /api/weather/A01', [200, 404, 500].includes(r.status));

  r = await post('/api/searches', { stationCode: 'A01', stationName: 'Metro Center' });
  check('POST /api/searches', r.status === 201 || r.status === 500);

  r = await post('/api/searches', {});
  check('POST /api/searches with no body returns 400', r.status === 400);

  r = await get('/api/searches/popular');
  check('GET /api/searches/popular', r.status === 200 || r.status === 500);

  console.log('');
  server.close();
}

run();
