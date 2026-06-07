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
| `GET`  | `/healthz`     | —                     | Health check for hosting platforms.      |

## Host it yourself for free (data stays on your laptop)

Want it public, persistent, and **completely free**? Run it on your own
machine — the SQLite database lives in `data/salads.db` on your disk, so your
salad history persists across restarts — and expose it with a free tunnel.

> **Trade-off:** the site is only reachable while your laptop is awake and
> running both the server and the tunnel. Great for an office/friends board;
> not for 24/7 uptime.

**1. Start the app** (one terminal):

```bash
npm install && npm start          # serves on http://localhost:3000
```

**2. Open a free public tunnel** (a second terminal) — pick one:

- **Tailscale Funnel** — *recommended:* a stable URL with no request limits,
  free for personal use. One-time setup: install Tailscale, sign in, and enable
  Funnel in the admin console. Then:

  ```bash
  tailscale funnel 3000
  # -> https://<your-machine>.<tailnet>.ts.net   (same URL every time)
  ```

- **Cloudflare Quick Tunnel** — fastest, no account (the URL changes each run):

  ```bash
  cloudflared tunnel --url http://localhost:3000   # or: npm run tunnel:cloudflare
  # -> https://<random>.trycloudflare.com
  ```

- **ngrok** — easy, with a stable free `*.ngrok-free.dev` domain:

  ```bash
  ngrok http 3000                                  # or: npm run tunnel:ngrok
  # -> https://<name>.ngrok-free.dev
  ```

  ngrok's free plan caps you at ~20k requests and 1 GB/month and shows a
  click-through warning page. Because this board polls every 30s, a tab left
  open all day can approach that cap — so for a board people keep open, prefer
  Tailscale or Cloudflare. (The page already pauses polling while its tab is
  backgrounded to help.)

Want it always-on *without* your laptop and still free? You'd need an
always-free VM (e.g. Oracle Cloud Always Free) or a free hosted
SQLite-compatible database (e.g. Turso) behind one of the cloud options below —
more setup, but no laptop required.

## Deploying to the cloud

This is a standard Node web service that needs a long-running process and a
writable file for SQLite (so static hosts like GitHub Pages won't work). The
repo ships ready-to-use config for the paths below.

### Option A — Render (fastest, free)

Best when you just want a public URL in a couple of minutes.

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to <https://render.com>, sign in with GitHub.
3. **New +** → **Blueprint** → pick this repo. Render reads
   [`render.yaml`](./render.yaml) and deploys a free web service.
4. You'll get a public `https://<name>.onrender.com` URL.

> ⚠️ The **free** plan has no persistent disk, so the salad history resets on
> each redeploy and after the service spins down when idle. For permanent
> history, switch the plan to `starter` and uncomment the `disk` block in
> `render.yaml` (see the comments there), or use Option B.

### Option B — Fly.io (persistent shared board)

Best when you want the salad history to stick around. Uses a Fly volume.

```bash
# one-time, on your machine:
brew install flyctl          # or: curl -L https://fly.io/install.sh | sh
fly auth login

# edit the `app` name in fly.toml to something globally unique, then:
fly launch --no-deploy --copy-config   # registers the app from fly.toml
fly volumes create salad_data --size 1 --region iad
fly deploy
```

This builds the included [`Dockerfile`](./Dockerfile), mounts a persistent
volume at `/data`, and gives you a public `https://<app>.fly.dev` URL.

### Option C — any Docker host

The [`Dockerfile`](./Dockerfile) runs anywhere (Railway, Google Cloud Run, a
VPS, etc.):

```bash
docker build -t last-salad .
docker run -p 3000:3000 -v salad_data:/data last-salad
```

Mount a volume at `/data` (or set `DB_PATH`) so the database persists.

## License

MIT
