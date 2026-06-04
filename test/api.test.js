'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, createDb } = require('../server');

let server;
let base;

before(async () => {
  const db = createDb(':memory:');
  const app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

test('starts with an empty tracker', async () => {
  const res = await fetch(`${base}/api/state`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.entries, []);
  assert.equal(body.lastSaladAt, null);
  assert.ok(body.serverNow, 'serverNow should be present');
});

test('records a salad and resets the tracker', async () => {
  const res = await fetch(`${base}/api/salads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dana', salad: 'Caesar' }),
  });
  assert.equal(res.status, 201);
  const entry = await res.json();
  assert.equal(entry.name, 'Dana');
  assert.equal(entry.salad, 'Caesar');
  assert.ok(entry.id > 0);
  assert.ok(entry.createdAt);

  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.entries.length, 1);
  assert.equal(state.lastSaladAt, entry.createdAt);
});

test('keeps entries in chronological order, newest last', async () => {
  await fetch(`${base}/api/salads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ravi', salad: 'Greek' }),
  });
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.ok(state.entries.length >= 2);
  const last = state.entries[state.entries.length - 1];
  assert.equal(last.name, 'Ravi');
});

test('rejects entries that are missing a name or salad', async () => {
  for (const body of [{ name: 'No Salad' }, { salad: 'Orphaned' }, {}]) {
    const res = await fetch(`${base}/api/salads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 400);
  }
});

test('trims whitespace and enforces length limits', async () => {
  const longName = 'n'.repeat(200);
  const res = await fetch(`${base}/api/salads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `  ${longName}  `, salad: '  Cobb  ' }),
  });
  assert.equal(res.status, 201);
  const entry = await res.json();
  assert.equal(entry.salad, 'Cobb');
  assert.equal(entry.name.length, 60);
});
