# 🥗 Days Since Our Last Salad

A shared **"days since our last salad"** tracker, styled like the classic
workplace **"days since last accident"** safety sign.

Anyone can drop in their name and the salad they ate, hit the big red button,
and the counter resets to zero. Every salad is recorded on a color-coded
timeline so you can see exactly who broke the streak — and when.

![Safety-sign styled counter with a report form and a color-coded timeline.](https://img.shields.io/badge/streak-in_danger-e8443b)

## Features

- **Live counter** — counts the days (plus a ticking `h m s`) since the most
  recent salad. It increments on its own with each passing day.
- **Reset button** — logging a salad resets the counter and appends the entry
  to the bottom of the timeline.
- **Color-coded timeline** — a horizontal "when did it happen" strip and a
  chronological log, with each person assigned a consistent color.
- **Record streak** — tracks the longest salad-free stretch ever achieved.
- **Shared** — everyone hitting the same server sees the same board. The page
  quietly refreshes every 30 seconds to pick up other people's salads.

## Tech

- **Backend:** Node.js + [Express](https://expressjs.com/), with a tiny REST API.
- **Storage:** [SQLite](https://www.sqlite.org/) via
  [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — a single
  file, no separate database server.
- **Frontend:** vanilla HTML/CSS/JS. No build step.

## Running it

Requires Node.js 18+ (developed on Node 22).

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

For development with auto-reload:

```bash
npm run dev
```

### Configuration

| Variable  | Default            | Description                          |
| --------- | ------------------ | ------------------------------------ |
| `PORT`    | `3000`             | Port the server listens on.          |
| `DB_PATH` | `data/salads.db`   | Where the SQLite database is stored. |

## Tests

```bash
npm test
```

Runs the API smoke tests with the built-in Node test runner against an
in-memory database.

## API

| Method | Route          | Body                  | Description                              |
| ------ | -------------- | --------------------- | ---------------------------------------- |
| `GET`  | `/api/state`   | —                     | All entries, the last salad time, and the server clock. |
| `POST` | `/api/salads`  | `{ name, salad }`     | Records a salad and resets the counter.  |

## Deploying

This is a standard Node web service. Any host that runs Node and lets you keep
a writable file for SQLite will work (Render, Railway, Fly.io, a VPS, etc.).
Set `PORT` if your host requires it, and point `DB_PATH` at a persistent volume
so the salad history survives restarts.

## License

MIT
