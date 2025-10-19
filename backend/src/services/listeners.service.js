import { readStationsList } from './stations.service.js';

const store = {
  map: new Map(),
  clients: new Set(),
  timer: null
};

function idForStation(s) {
  return s.id || s.slug || s.name;
}

function ensureInitialized() {
  const stations = readStationsList();
  for (const s of stations) {
    const id = idForStation(s);
    if (!store.map.has(id)) {
      const base = typeof s.listeners === 'number' ? s.listeners : Math.floor(10 + Math.random() * 90);
      store.map.set(id, Math.max(0, base));
    }
  }
}

function randomDrift(current) {
  const delta = Math.floor((Math.random() - 0.45) * 10); // -4..+5
  return Math.max(0, current + delta);
}

function tick() {
  ensureInitialized();
  for (const [id, count] of store.map.entries()) {
    store.map.set(id, randomDrift(count));
  }
  const payload = JSON.stringify({
    type: 'listeners:update',
    ts: Date.now(),
    listeners: Object.fromEntries(store.map)
  });
  for (const res of store.clients) {
    try {
      res.write(`event: listeners\n`);
      res.write(`data: ${payload}\n\n`);
    } catch {}
  }
}

export function startListeners() {
  if (store.timer) return;
  store.timer = setInterval(tick, 10_000);
}

export function getSnapshot() {
  ensureInitialized();
  return { ts: Date.now(), listeners: Object.fromEntries(store.map) };
}

export function addSSEClient(res) {
  ensureInitialized();
  store.clients.add(res);
}

export function removeSSEClient(res) {
  try { store.clients.delete(res); } catch {}
}
