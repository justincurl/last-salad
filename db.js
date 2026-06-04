'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

/**
 * Create (or open) the salad database and return a small set of query helpers.
 *
 * @param {string} dbPath Path to the SQLite file, or ':memory:' for an
 *   ephemeral in-memory database (handy for tests).
 */
function createDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS salads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      salad      TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const insertStmt = db.prepare(
    'INSERT INTO salads (name, salad, created_at) VALUES (?, ?, ?)'
  );
  // Oldest first so the timeline reads top-to-bottom and new entries land at
  // the bottom, just like a real "days since last accident" logbook.
  const selectAllStmt = db.prepare(
    'SELECT id, name, salad, created_at AS createdAt FROM salads ORDER BY created_at ASC, id ASC'
  );

  return {
    /** Record a freshly eaten salad and return the stored entry. */
    addEntry(name, salad) {
      const createdAt = new Date().toISOString();
      const info = insertStmt.run(name, salad, createdAt);
      return { id: Number(info.lastInsertRowid), name, salad, createdAt };
    },

    /** Every salad ever eaten, oldest first. */
    getEntries() {
      return selectAllStmt.all();
    },

    /** Close the underlying handle (used by tests). */
    close() {
      db.close();
    },
  };
}

module.exports = { createDb };
