'use strict';

// --- Time constants --------------------------------------------------------
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// --- Live state ------------------------------------------------------------
// `state` mirrors the server response plus the bookkeeping needed to keep the
// counter ticking accurately against the *server's* clock, not the browser's.
const state = {
  entries: [],
  lastMs: null, // timestamp of the most recent salad, in ms
  serverNowMs: 0, // server's clock at the moment we fetched
  clientAtFetch: 0, // performance/Date.now() when we received that clock
  historicalMaxGapMs: 0, // longest gap between two consecutive salads
};

// Remember which entry id was added in this browser so we can celebrate it.
let justAddedId = null;

// --- DOM references --------------------------------------------------------
const el = {
  sign: document.querySelector('.sign'),
  days: document.getElementById('counter-days'),
  unit: document.getElementById('counter-unit'),
  live: document.getElementById('counter-live'),
  subtitle: document.getElementById('sign-subtitle'),
  statRecord: document.getElementById('stat-record'),
  statTotal: document.getElementById('stat-total'),
  statOffender: document.getElementById('stat-offender'),
  legend: document.getElementById('legend'),
  track: document.getElementById('track'),
  trackAxis: document.getElementById('track-axis'),
  entries: document.getElementById('entries'),
  timelineEmpty: document.getElementById('timeline-empty'),
  form: document.getElementById('salad-form'),
  name: document.getElementById('name'),
  salad: document.getElementById('salad'),
  button: document.getElementById('submit-button'),
  error: document.getElementById('form-error'),
};

// --- Helpers ---------------------------------------------------------------

/** Best estimate of the server's "now", corrected for client clock skew. */
function effectiveNow() {
  return state.serverNowMs + (Date.now() - state.clientAtFetch);
}

/** Deterministic, pleasant colour for a given person's name. */
function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const sat = 62 + ((hash >> 9) % 18); // 62–79%
  const light = 52 + ((hash >> 15) % 12); // 52–63%
  return `hsl(${hue} ${sat}% ${light}%)`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Compact human duration for the "record" stat, e.g. "3d 7h". */
function humanizeShort(ms) {
  if (ms < 0) ms = 0;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "just now", "3 mins ago", "2 days ago", … */
function relativeTime(ms) {
  const s = Math.round(ms / SECOND);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mo ago`;
  return `${Math.round(mo / 12)} yr ago`;
}

function absoluteTime(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// --- The ticking counter (runs every second) -------------------------------

function tick() {
  if (state.lastMs == null) {
    // Nobody has ever eaten a salad: infinitely many days since the last one.
    el.days.textContent = '∞';
    el.unit.textContent = 'DAYS';
    el.live.textContent = 'since records began';
    el.subtitle.textContent = 'No salads on record yet — be the first to ruin it.';
    el.statRecord.textContent = '0d';
    return;
  }

  const diff = Math.max(0, effectiveNow() - state.lastMs);
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  const mins = Math.floor((diff % HOUR) / MINUTE);
  const secs = Math.floor((diff % MINUTE) / SECOND);

  el.days.textContent = String(days);
  el.unit.textContent = days === 1 ? 'DAY' : 'DAYS';
  el.live.textContent = `+ ${hours}h ${pad2(mins)}m ${pad2(secs)}s and counting`;
  el.subtitle.textContent = 'without a salad-related incident';

  // The record is the longest streak ever — which may be the one in progress.
  const record = Math.max(state.historicalMaxGapMs, diff);
  el.statRecord.textContent = humanizeShort(record);
}

// --- Rendering the parts that only change on fetch/submit ------------------

function renderTimeline() {
  const entries = state.entries;
  const hasEntries = entries.length > 0;

  el.statTotal.textContent = String(entries.length);

  if (hasEntries) {
    const last = entries[entries.length - 1];
    el.statOffender.textContent = last.name;
    el.statOffender.title = `${last.name} ate ${last.salad}`;
  } else {
    el.statOffender.textContent = '—';
    el.statOffender.removeAttribute('title');
  }

  // Legend: each unique person, in first-seen order, with a salad count.
  const counts = new Map();
  for (const e of entries) {
    counts.set(e.name, (counts.get(e.name) || 0) + 1);
  }
  el.legend.replaceChildren();
  for (const [name, count] of counts) {
    const item = document.createElement('span');
    item.className = 'legend__item';

    const dot = document.createElement('span');
    dot.className = 'legend__dot';
    dot.style.background = colorForName(name);

    const label = document.createElement('span');
    label.textContent = name;

    const c = document.createElement('span');
    c.className = 'legend__count';
    c.textContent = `×${count}`;

    item.append(dot, label, c);
    el.legend.append(item);
  }

  // Horizontal track: place a dot per salad along a first-salad → now axis.
  el.track.replaceChildren();
  el.trackAxis.replaceChildren();
  if (hasEntries) {
    const first = Date.parse(entries[0].createdAt);
    const span = Math.max(1, effectiveNow() - first); // avoid divide-by-zero
    for (const e of entries) {
      const t = Date.parse(e.createdAt);
      const pct = Math.min(100, Math.max(0, ((t - first) / span) * 100));
      const dot = document.createElement('span');
      dot.className = 'track__dot';
      dot.style.left = `${pct}%`;
      dot.style.background = colorForName(e.name);
      dot.title = `${e.name} — ${e.salad} (${absoluteTime(t)})`;
      el.track.append(dot);
    }
    const left = document.createElement('span');
    left.textContent = absoluteTime(first);
    const right = document.createElement('span');
    right.textContent = 'now';
    el.trackAxis.append(left, right);
  }

  // Chronological list, oldest at the top, newest at the bottom.
  el.entries.replaceChildren();
  const now = effectiveNow();
  for (const e of entries) {
    const t = Date.parse(e.createdAt);
    const li = document.createElement('li');
    li.className = 'entry';
    if (e.id === justAddedId) li.classList.add('entry--new');

    const dot = document.createElement('span');
    dot.className = 'entry__dot';
    dot.style.background = colorForName(e.name);

    const name = document.createElement('span');
    name.className = 'entry__name';
    name.textContent = e.name;
    name.style.color = colorForName(e.name);

    const salad = document.createElement('span');
    salad.className = 'entry__salad';
    salad.textContent = e.salad;

    const time = document.createElement('span');
    time.className = 'entry__time';
    time.textContent = relativeTime(now - t);
    time.title = absoluteTime(t);

    li.append(dot, name, salad, time);
    el.entries.append(li);
  }

  el.timelineEmpty.hidden = hasEntries;
  el.entries.hidden = !hasEntries;
  justAddedId = null;
}

// --- Data fetching ---------------------------------------------------------

async function fetchState() {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error(`Failed to load tracker (${res.status})`);
  const data = await res.json();

  state.entries = data.entries;
  state.serverNowMs = Date.parse(data.serverNow);
  state.clientAtFetch = Date.now();
  state.lastMs = data.lastSaladAt ? Date.parse(data.lastSaladAt) : null;

  // Precompute the longest historical gap between consecutive salads.
  let maxGap = 0;
  for (let i = 1; i < state.entries.length; i++) {
    const gap = Date.parse(state.entries[i].createdAt) -
      Date.parse(state.entries[i - 1].createdAt);
    if (gap > maxGap) maxGap = gap;
  }
  state.historicalMaxGapMs = maxGap;

  renderTimeline();
  tick();
}

// --- Form handling ---------------------------------------------------------

async function onSubmit(event) {
  event.preventDefault();
  el.error.hidden = true;

  const name = el.name.value.trim();
  const salad = el.salad.value.trim();
  if (!name || !salad) {
    showError('Please enter both your name and the salad you ate.');
    return;
  }

  el.button.disabled = true;
  try {
    const res = await fetch('/api/salads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, salad }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Something went wrong (${res.status}).`);
    }
    const entry = await res.json();
    justAddedId = entry.id;

    el.salad.value = '';
    el.salad.focus();
    flashSign();
    await fetchState();
  } catch (err) {
    showError(err.message);
  } finally {
    el.button.disabled = false;
  }
}

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
}

function flashSign() {
  el.sign.classList.remove('flash');
  // Force reflow so the animation can restart even on rapid resets.
  void el.sign.offsetWidth;
  el.sign.classList.add('flash');
}

// --- Boot ------------------------------------------------------------------

el.form.addEventListener('submit', onSubmit);

fetchState().catch((err) => showError(err.message));

// Keep the big number alive, and quietly pick up other people's salads.
setInterval(tick, SECOND);
setInterval(() => {
  fetchState().catch(() => {/* transient network hiccup; try again next time */});
}, 30 * SECOND);
