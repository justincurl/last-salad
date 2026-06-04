'use strict';

const path = require('path');
const express = require('express');
const { createDb } = require('./db');

const MAX_NAME_LEN = 60;
const MAX_SALAD_LEN = 120;

/**
 * Build the Express app around a database instance. Exported as a factory so
 * tests can inject an in-memory database.
 */
function createApp(db) {
  const app = express();
  app.use(express.json());

  // --- API ---------------------------------------------------------------

  // Current state of the tracker: every entry plus the server's clock so the
  // browser can compute "days since" without trusting the local clock.
  app.get('/api/state', (req, res) => {
    const entries = db.getEntries();
    const lastSaladAt = entries.length ? entries[entries.length - 1].createdAt : null;
    res.json({
      serverNow: new Date().toISOString(),
      lastSaladAt,
      entries,
    });
  });

  // Log a salad. This is the "reset the counter" button: the newest entry's
  // timestamp becomes "now", so days-since drops back to zero.
  app.post('/api/salads', (req, res) => {
    const body = req.body || {};
    let name = typeof body.name === 'string' ? body.name.trim() : '';
    let salad = typeof body.salad === 'string' ? body.salad.trim() : '';

    if (!name || !salad) {
      return res
        .status(400)
        .json({ error: 'Both a name and a salad are required.' });
    }

    name = name.slice(0, MAX_NAME_LEN);
    salad = salad.slice(0, MAX_SALAD_LEN);

    const entry = db.addEntry(name, salad);
    res.status(201).json(entry);
  });

  // --- Static frontend ---------------------------------------------------

  app.use(express.static(path.join(__dirname, 'public')));

  return app;
}

// Only start a server when run directly (not when imported by tests).
if (require.main === module) {
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'salads.db');
  const db = createDb(dbPath);
  const app = createApp(db);
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`🥗  Salad tracker running at http://localhost:${port}`);
  });
}

module.exports = { createApp, createDb };
