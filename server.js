// server.js - Serveur API pour Eclairia (copié de radio-test)
import express from 'express';
import fetch from 'node-fetch';
import RSSParser from 'rss-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const rssParser = new RSSParser({ timeout: 10000, headers: { 'User-Agent': 'Eclairia-Podcast-Fetcher/1.0' } });

// In-memory Live Listeners store
const listenersStore = {
  // id -> number
  map: new Map(),
  // connected SSE clients
  clients: new Set(),
  // update interval handle
  timer: null,
};

function readStationsFile() {
  const stationsPath = path.join(__dirname, 'frontend/public/api/stations.json');
  const stationsData = fs.readFileSync(stationsPath, 'utf8');
  const stations = JSON.parse(stationsData || '[]');
  return Array.isArray(stations) ? stations : [];
}

function ensureListenersInitialized() {
  const stations = readStationsFile();
  for (const s of stations) {
    const id = s.id || s.slug || s.name; // best-effort identifier
    if (!listenersStore.map.has(id)) {
      // Initialize with small baseline audience
      const base = typeof s.listeners === 'number' ? s.listeners : Math.floor(10 + Math.random() * 90);
      listenersStore.map.set(id, Math.max(0, base));
    }
  }
}

function randomDrift(current) {
  // Gentle random walk with floor at 0
  const delta = Math.floor((Math.random() - 0.45) * 10); // -4..+5 approx
  return Math.max(0, current + delta);
}

function tickListeners() {
  ensureListenersInitialized();
  // Update all counts
  for (const [id, count] of listenersStore.map.entries()) {
    listenersStore.map.set(id, randomDrift(count));
  }
  // Broadcast to SSE clients
  const payload = JSON.stringify({
    type: 'listeners:update',
    ts: Date.now(),
    listeners: Object.fromEntries(listenersStore.map)
  });
  for (const res of listenersStore.clients) {
    try {
      res.write(`event: listeners\n`);
      res.write(`data: ${payload}\n\n`);
    } catch {}
  }
}

function startListenersTimer() {
  if (listenersStore.timer) return;
  listenersStore.timer = setInterval(tickListeners, 10_000); // every 10s
}

// ========== Audio upload/list API ==========
// Multer storage setup to save files under frontend/public/audio
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'frontend/public/audio'));
  },
  filename: function (req, file, cb) {
    const ext = (() => {
      const m = (file.mimetype || '').toLowerCase();
      if (m.includes('wav')) return '.wav';
      if (m.includes('ogg')) return '.ogg';
      if (m.includes('webm')) return '.webm';
      if (m.includes('mp3') || m.includes('mpeg')) return '.mp3';
      return path.extname(file.originalname || '') || '.dat';
    })();
    const safeBase = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${safeBase}${ext}`);
  }
});
const upload = multer({ storage });

// Separate storage for radio comments -> save under frontend/public/comments_audio
const commentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'frontend/public/comments_audio'));
  },
  filename: function (req, file, cb) {
    const m = (file.mimetype || '').toLowerCase();
    const ext = m.includes('wav') ? '.wav'
      : m.includes('ogg') ? '.ogg'
      : m.includes('webm') ? '.webm'
      : (path.extname(file.originalname || '') || '.dat');
    const safeBase = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${safeBase}${ext}`);
  }
});
const uploadComment = multer({ storage: commentsStorage });

// GET: list audio notes
app.get('/api/audios', async (req, res) => {
  try {
    const p = path.join(__dirname, 'frontend/public/api/audios.json');
    const raw = fs.readFileSync(p, 'utf8');
    const list = JSON.parse(raw || '[]');
    res.json(list);
  } catch (err) {
    console.error('❌ Erreur lecture audios.json:', err);
    res.status(500).json({ error: 'Failed to read audios' });
  }
});

// POST: upload a new audio note
// Expects multipart/form-data with fields: file, title, user, userId, duration, lat, lng, description, category
app.post('/api/audios', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, user, userId, duration, lat, lng, description, category } = req.body || {};
    const id = Date.now().toString();
    const fileUrl = `/audio/${req.file.filename}`;
    const latNum = isFinite(parseFloat(lat)) ? parseFloat(lat) : 0;
    const lngNum = isFinite(parseFloat(lng)) ? parseFloat(lng) : 0;
    const note = {
      id,
      title: title || 'Note vocale',
      user: user || 'Utilisateur',
      userId: userId || 'current-user',
      // Leaflet expects [lat, lng]
      coordinates: [latNum || 0, lngNum || 0],
      lat: latNum || 0,
      lng: lngNum || 0,
      duration: duration || null,
      timestamp: new Date().toISOString(),
      description: description || '',
      audioUrl: fileUrl,
      category: category || 'Général'
    };

    const p = path.join(__dirname, 'frontend/public/api/audios.json');
    let list = [];
    try {
      const raw = fs.readFileSync(p, 'utf8');
      list = JSON.parse(raw || '[]');
    } catch {}
    
    // Enforce one audio per user constraint
    const userAudios = list.filter(audio => 
      audio.userId === note.userId || 
      (audio.user === note.user && (note.user === 'Éclaireur' || note.user === 'Utilisateur'))
    );
    
    // Remove old user audios and their files
    for (const oldAudio of userAudios) {
      // Remove from list
      const index = list.findIndex(audio => audio.id === oldAudio.id);
      if (index > -1) {
        list.splice(index, 1);
      }
      
      // Delete old audio file
      if (oldAudio.audioUrl) {
        const oldFilePath = path.join(__dirname, 'frontend/public', oldAudio.audioUrl);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (deleteErr) {
        }
      }
    }
    
    list.unshift(note);
    fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');

    res.json({ ok: true, note });
  } catch (err) {
    console.error('💥 Erreur upload audio:', err);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

 
// Simple in-memory cache for episodes endpoint
const episodesCache = {
  data: null,
  timestamp: 0,
  ttlMs: 15 * 60 * 1000 // 15 minutes
};

// Parse itunes duration to seconds (handles HH:MM:SS, MM:SS, or numeric string)
function parseDurationToSeconds(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && isFinite(raw)) return Math.max(0, Math.floor(raw));
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return Math.max(0, parseInt(str, 10));
  const parts = str.split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts; return (h * 3600) + (m * 60) + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts; return (m * 60) + s;
  }
  if (parts.length === 1) return Math.max(0, parts[0] || 0);
  return null;
}

// Enable CORS for all routes (frontend runs on a different port)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Normalize existing audios.json to ensure lat/lng fields exist, coordinates are [lat, lng],
// and remove deprecated country/city fields
const normalizeAudiosFile = () => {
  try {
    const p = path.join(__dirname, 'frontend/public/api/audios.json');
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, 'utf8');
    const list = JSON.parse(raw || '[]');
    if (!Array.isArray(list)) return;

    let changed = false;
    const normalized = list.map((n) => {
      const out = { ...n };
      const lat = isFinite(parseFloat(out.lat)) ? parseFloat(out.lat) : (
        Array.isArray(out.coordinates) && isFinite(parseFloat(out.coordinates[0])) ? parseFloat(out.coordinates[0]) : 0
      );
      const lng = isFinite(parseFloat(out.lng)) ? parseFloat(out.lng) : (
        Array.isArray(out.coordinates) && isFinite(parseFloat(out.coordinates[1])) ? parseFloat(out.coordinates[1]) : 0
      );

      // If previous code stored [lng, lat], attempt to detect and fix when obviously swapped
      // Heuristic: if value ranges look swapped (lat should be -90..90, lng -180..180)
      let latFixed = lat;
      let lngFixed = lng;
      if ((lat < -90 || lat > 90) && (lng >= -90 && lng <= 90)) {
        latFixed = lng;
        lngFixed = lat;
      }

      // Write back standard fields
      if (!out.lat || out.lat !== latFixed) { out.lat = latFixed; changed = true; }
      if (!out.lng || out.lng !== lngFixed) { out.lng = lngFixed; changed = true; }
      const coords = [latFixed || 0, lngFixed || 0];
      if (!Array.isArray(out.coordinates) || out.coordinates[0] !== coords[0] || out.coordinates[1] !== coords[1]) {
        out.coordinates = coords; changed = true;
      }
      if ('country' in out) { delete out.country; changed = true; }
      if ('city' in out) { delete out.city; changed = true; }
      return out;
    });

    if (changed) {
      fs.writeFileSync(p, JSON.stringify(normalized, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('⚠️ Normalization audios.json échouée:', e.message);
  }
};

normalizeAudiosFile();

// Serve uploaded audio files
app.use('/audio', express.static(path.join(__dirname, 'frontend/public/audio')));
// Serve radio comments audio files
app.use('/comments_audio', express.static(path.join(__dirname, 'frontend/public/comments_audio')));

// Initialize required directories and files
const initializeDirectories = () => {
  const dirs = [
    path.join(__dirname, 'frontend/public'),
    path.join(__dirname, 'frontend/public/audio'),
    path.join(__dirname, 'frontend/public/api'),
    path.join(__dirname, 'frontend/public/comments_audio'),
    path.join(__dirname, 'frontend/public/api/reports')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  
  const files = {
    'frontend/public/api/audios.json': [],
    'frontend/public/api/radio_comments.json': {},
    'frontend/public/api/podcast_comments.json': {}
  };
  
  Object.entries(files).forEach(([filePath, defaultContent]) => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, JSON.stringify(defaultContent, null, 2));
    }
  });
};

initializeDirectories();

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// API endpoint to fetch latest episodes from each podcast RSS
app.get('/api/podcasts/episodes', async (req, res) => {
  try {
    // Serve from cache if fresh
    const now = Date.now();
    if (episodesCache.data && (now - episodesCache.timestamp) < episodesCache.ttlMs) {
      res.set('X-Eclairia-Cache', 'HIT');
      return res.json(episodesCache.data);
    }

    const podcastsPath = path.join(__dirname, 'frontend/public/api/podcasts.json');
    const podcastsData = fs.readFileSync(podcastsPath, 'utf8');
    const feeds = JSON.parse(podcastsData);

    const results = await Promise.allSettled(
      feeds.map(async (f) => {
        try {
          const feed = await rssParser.parseURL(f.rss);
          const latest = Array.isArray(feed.items) && feed.items.length ? feed.items[0] : null;
          if (!latest) {
            return {
              feedId: f.id || null,
              feedTitle: f.title || feed?.title || 'Podcast',
              rss: f.rss,
              episode: null
            };
          }

          // Normalize fields
          const audioUrl = latest.enclosure?.url || latest.enclosures?.[0]?.url || latest.itunes?.episodeUrl || null;
          const image = latest.itunes?.image || feed.image?.url || null;
          const description = latest.contentSnippet || latest.content || latest.summary || '';
          const published = latest.isoDate || latest.pubDate || null;
          const duration = parseDurationToSeconds(latest.itunes?.duration) ?? null;

          return {
            feedId: f.id || null,
            feedTitle: f.title || feed.title || 'Podcast',
            rss: f.rss,
            episode: {
              title: latest.title || 'Episode',
              audioUrl,
              image,
              description,
              published,
              duration
            }
          };
        } catch (e) {
          return {
            feedId: f.id || null,
            feedTitle: f.title || 'Podcast',
            rss: f.rss,
            error: e?.message || 'Failed to parse RSS',
            episode: null
          };
        }
      })
    );

    const normalized = results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Unknown error' }));
    // Update cache
    episodesCache.data = normalized;
    episodesCache.timestamp = now;
    res.set('X-Eclairia-Cache', 'MISS');
    res.json(normalized);
  } catch (error) {
    console.error('❌ Erreur lecture épisodes:', error);
    res.status(500).json({ error: 'Failed to load podcast episodes' });
  }
});

// Whitelist des domaines radio de confiance (copié de radio-test)
const ALLOWLIST = [
  'rfifm64k.ice.infomaniak.ch',
  'african1paris.ice.infomaniak.ch',
  'dreamsiteradiocp4.com',
  'stream.live.vc.bbcmedia.co.uk',
  'scdn.nrjaudio.fm',
  'radio-trace.ice.infomaniak.ch',
  'www.soundhelix.com',
  'rmc.bfmtv.com',
  'radio.garden',
  'stream.zeno.fm',
  // Cameroon (non–Radio Garden) additions
  '46.105.111.94',            // ABK Radio 89.9 Douala
  'listen.radioking.com',     // CRTV Radio (Radioking CDN)
  // Stations africaines ajoutées
  'mpbradio.ice.infomaniak.ch',     // Top Congo FM
  'rs1.radiostreamer.com',          // Radio Okapi
  '213.136.96.14',                  // Radio Nostalgie CI
  'studio.webradio.solutions',      // Urban FM Gabon
  'dreamsiteradiocp.com',          // Radio Maria Congo
  'stream.radiondekeluka.org',     // Radio Ndeke Luka
  'c26.radioboss.fm',              // Radio Ndarason
  'listen.rba.co.rw',              // Radio Rwanda
  'isanganiro.ice.infomaniak.ch',  // Radio Isanganiro
  'ballaradio.com',                // Balla Radio
  'kfm-kindu.com',                 // KFM Kindu
  'rtc-mali.com',                  // RTC-MALI
  'maniema1.com',                  // Maniema Numéro 1
  'crtv-ouest.cm',                 // CRTV Ouest
  'poala-fm.com',                  // Poala FM
  'rbn-bafoussam.com',             // Radio Bonne Nouvelle
  'voix-montagnes.cm',             // Voix des Montagnes
  // Podcasts / RSS audio hosts
  'anchor.fm',
  'd3ctxlq1ktw2nl.cloudfront.net',
  'devscast.tech',
  // Additional podcast media CDNs/hosts
  'audio.ausha.co',
  'sphinx.acast.com',
  'www.buzzsprout.com',
  // RFI podcast media (for Revue de presse Afrique)
  'aod-rfi.akamaized.net',
  'rfiplay-vh.akamaihd.net',
  'media.rfi.fr'
];

function isAllowed(urlString){
  try{
    const u = new URL(urlString);
    return ALLOWLIST.includes(u.hostname);
  }catch(e){ 
    console.log('❌ URL invalide:', urlString);
    return false; 
  }
}

// Proxy endpoint avec logs détaillés (copié de radio-test)
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url param');
  
  
  if (!isAllowed(targetUrl)) {
    return res.status(403).send('Domain not allowed');
  }

  try{
    // Forward Range header for partial content requests (improves audio startup)
    const forwardHeaders = {
      'User-Agent': 'Eclairia-Radio-Player/1.0'
    };
    if (req.headers['range']) {
      forwardHeaders['Range'] = req.headers['range'];
    }

    const response = await fetch(targetUrl, { 
      method: 'GET',
      headers: forwardHeaders
    });
    
    if (!response.ok) {
      return res.status(response.status).send(`Error fetching: ${response.statusText}`);
    }

    // Pass through important headers and status (support 206 Partial Content)
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const acceptRanges = response.headers.get('accept-ranges');
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Content-Type', contentType);
    if (acceptRanges) res.set('Accept-Ranges', acceptRanges);
    if (contentRange) res.set('Content-Range', contentRange);
    if (contentLength) res.set('Content-Length', contentLength);

    // Mirror origin status (e.g., 206)
    res.status(response.status);

    // Pipe the response body directly
    response.body.pipe(res);

  }catch(err){
    console.error('💥 Erreur proxy:', err.message);
    res.status(500).send('Error fetching stream');
  }
});

// API endpoint for stations (copié de radio-test)
app.get('/api/stations', async (req, res) => {
  try {
    const stations = readStationsFile();
    ensureListenersInitialized();
    const withListeners = stations.map((s) => {
      const id = s.id || s.slug || s.name;
      const listeners = listenersStore.map.get(id) ?? (typeof s.listeners === 'number' ? s.listeners : 0);
      return { ...s, listeners };
    });

    res.json(withListeners);
  } catch (error) {
    console.error('❌ Erreur lecture stations:', error);
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

// Polling endpoint: returns only listeners map (id -> count)
app.get('/api/stations/listeners', (req, res) => {
  try {
    ensureListenersInitialized();
    res.json({
      ts: Date.now(),
      listeners: Object.fromEntries(listenersStore.map)
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get listeners' });
  }
});

// SSE endpoint: real-time listeners updates
app.get('/api/stations/listeners/stream', (req, res) => {
  try {
    ensureListenersInitialized();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Add to clients
    listenersStore.clients.add(res);

    // Send initial snapshot
    const initial = JSON.stringify({
      type: 'listeners:init',
      ts: Date.now(),
      listeners: Object.fromEntries(listenersStore.map)
    });
    res.write(`event: listeners\n`);
    res.write(`data: ${initial}\n\n`);

    req.on('close', () => {
      try { listenersStore.clients.delete(res); } catch {}
    });
  } catch (e) {
    res.status(500).end();
  }
});

// API endpoint for podcasts (même logique que stations)
app.get('/api/podcasts', async (req, res) => {
  try {
    const podcastsPath = path.join(__dirname, 'frontend/public/api/podcasts.json');
    const podcastsData = fs.readFileSync(podcastsPath, 'utf8');
    const podcasts = JSON.parse(podcastsData);

    res.json(podcasts);
  } catch (error) {
    console.error('❌ Erreur lecture podcasts:', error);
    res.status(500).json({ error: 'Failed to load podcasts' });
  }
});

// API endpoint for radio comments
app.get('/api/radio_comments', async (req, res) => {
  try {
    const commentsPath = path.join(__dirname, 'frontend/public/api/radio_comments.json');
    let comments = {};
    try {
      const commentsData = fs.readFileSync(commentsPath, 'utf8');
      comments = JSON.parse(commentsData || '{}');
    } catch {
      comments = {};
    }

    res.json(comments);
  } catch (error) {
    console.error('❌ Erreur lecture radio_comments:', error);
    res.status(500).json({ error: 'Failed to load radio comments' });
  }
});

// POST endpoint to upload a radio comment and persist metadata per station
// Expects multipart/form-data fields: file, stationId, duration
app.post('/api/radio_comments', uploadComment.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { stationId, duration } = req.body || {};
    if (!stationId) {
      return res.status(400).json({ error: 'Missing stationId' });
    }

    const id = Date.now();
    const fileUrl = `/comments_audio/${req.file.filename}`;
    // Prefer a persistent client-provided machine ID header; fallback to client IP
    const clientMachineId = req.header('x-client-machine-id');
    const clientIp = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || req.ip || 'unknown';
    const userName = clientMachineId || clientIp;
    const entry = {
      id,
      userName,
      userAvatar: '/icon-ios.svg',
      audioUrl: fileUrl,
      duration: isFinite(parseInt(duration, 10)) ? parseInt(duration, 10) : null,
      timestamp: new Date().toISOString(),
      isOwn: true
    };

    const commentsPath = path.join(__dirname, 'frontend/public/api/radio_comments.json');
    let map = {};
    try {
      const raw = fs.readFileSync(commentsPath, 'utf8');
      map = JSON.parse(raw || '{}');
    } catch {}
    if (!map[stationId]) map[stationId] = [];
    map[stationId].push(entry);
    fs.writeFileSync(commentsPath, JSON.stringify(map, null, 2), 'utf8');

    res.json({ ok: true, comment: entry });
  } catch (error) {
    console.error('❌ Erreur POST /api/radio_comments:', error);
    res.status(500).json({ error: 'Failed to save radio comment' });
  }
});

// API endpoint for podcast comments
app.get('/api/podcast_comments', async (req, res) => {
  try {
    const commentsPath = path.join(__dirname, 'frontend/public/api/podcast_comments.json');
    let comments = {};
    try {
      const commentsData = fs.readFileSync(commentsPath, 'utf8');
      comments = JSON.parse(commentsData || '{}');
    } catch {
      comments = {};
    }
    res.json(comments);
  } catch (error) {
    console.error('❌ Erreur lecture podcast_comments:', error);
    res.status(500).json({ error: 'Failed to load podcast comments' });
  }
});

// POST endpoint to upload a podcast comment and persist metadata per podcast
// Expects multipart/form-data fields: file, podcastId, duration
app.post('/api/podcast_comments', uploadComment.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { podcastId, duration } = req.body || {};
    if (!podcastId) {
      return res.status(400).json({ error: 'Missing podcastId' });
    }

    const id = Date.now();
    const fileUrl = `/comments_audio/${req.file.filename}`;
    const clientMachineId = req.header('x-client-machine-id');
    const clientIp = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || req.ip || 'unknown';
    const userName = clientMachineId || clientIp;
    const entry = {
      id,
      userName,
      userAvatar: '/icon-ios.svg',
      audioUrl: fileUrl,
      duration: isFinite(parseInt(duration, 10)) ? parseInt(duration, 10) : null,
      timestamp: new Date().toISOString(),
      isOwn: true
    };

    const commentsPath = path.join(__dirname, 'frontend/public/api/podcast_comments.json');
    let map = {};
    try {
      const raw = fs.readFileSync(commentsPath, 'utf8');
      map = JSON.parse(raw || '{}');
    } catch {}
    if (!map[podcastId]) map[podcastId] = [];
    map[podcastId].push(entry);
    fs.writeFileSync(commentsPath, JSON.stringify(map, null, 2), 'utf8');

    res.json({ ok: true, comment: entry });
  } catch (error) {
    console.error('❌ Erreur POST /api/podcast_comments:', error);
    res.status(500).json({ error: 'Failed to save podcast comment' });
  }
});

// DELETE: delete an audio note by ID
app.delete('/api/audios/:id', async (req, res) => {
  try {
    const audioId = req.params.id;
    const p = path.join(__dirname, 'frontend/public/api/audios.json');
    
    let list = [];
    try {
      const raw = fs.readFileSync(p, 'utf8');
      list = JSON.parse(raw || '[]');
    } catch {}
    
    // Find the audio to delete
    const audioIndex = list.findIndex(audio => audio.id === audioId);
    if (audioIndex === -1) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    const audioToDelete = list[audioIndex];
    
    // Remove from list
    list.splice(audioIndex, 1);
    
    // Delete the audio file
    if (audioToDelete.audioUrl) {
      const filePath = path.join(__dirname, 'frontend/public', audioToDelete.audioUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteErr) {
      }
    }
    
    // Save updated list
    fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');
    
    res.json({ ok: true, deletedId: audioId });
  } catch (err) {
    console.error('💥 Erreur delete audio:', err);
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

// PATCH: update audio position (for real-time GPS tracking)
app.patch('/api/audios/:id/position', async (req, res) => {
  try {
    const audioId = req.params.id;
    const { lat, lng, timestamp } = req.body;
    
    if (!isFinite(parseFloat(lat)) || !isFinite(parseFloat(lng))) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    const p = path.join(__dirname, 'frontend/public/api/audios.json');
    let list = [];
    try {
      const raw = fs.readFileSync(p, 'utf8');
      list = JSON.parse(raw || '[]');
    } catch {}
    
    // Find and update the audio
    const audioIndex = list.findIndex(audio => audio.id === audioId);
    if (audioIndex === -1) {
      return res.status(404).json({ error: 'Audio not found' });
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    list[audioIndex].lat = latNum;
    list[audioIndex].lng = lngNum;
    list[audioIndex].coordinates = [latNum, lngNum];
    list[audioIndex].lastPositionUpdate = timestamp || new Date().toISOString();
    
    // Save updated list
    fs.writeFileSync(p, JSON.stringify(list, null, 2), 'utf8');
    
    res.json({ ok: true, audioId, lat: latNum, lng: lngNum });
  } catch (err) {
    console.error('💥 Erreur update position:', err);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// POST: report an audio note
app.post('/api/audios/report', async (req, res) => {
  try {
    const { audioId, reporterId, reason } = req.body;
    
    if (!audioId || !reporterId) {
      return res.status(400).json({ error: 'Missing audioId or reporterId' });
    }
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, 'frontend/public/api/reports');
    try {
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
    } catch {}
    
    // Log the report
    const report = {
      id: Date.now().toString(),
      audioId,
      reporterId,
      reason: reason || 'inappropriate',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    const reportsPath = path.join(reportsDir, 'audio_reports.json');
    let reports = [];
    try {
      const raw = fs.readFileSync(reportsPath, 'utf8');
      reports = JSON.parse(raw || '[]');
    } catch {}
    
    reports.unshift(report);
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2), 'utf8');
    
    res.json({ ok: true, reportId: report.id });
  } catch (err) {
    console.error('💥 Erreur report audio:', err);
    res.status(500).json({ error: 'Failed to report audio' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true, 
    timestamp: Date.now(),
    service: 'Eclairia Radio API',
    version: '1.0.0'
  });
});

// Fallback pour SPA (Vue Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎵 Serveur Eclairia: http://localhost:${PORT}`);
  console.log('🔧 Proxy endpoint: /proxy?url=...');
  console.log('📡 API stations: /api/stations');
  console.log('👂 Listeners snapshot: /api/stations/listeners');
  console.log('📡 Listeners SSE: /api/stations/listeners/stream');
  console.log('🎙️ API /api/podcasts: /api/podcasts');
  console.log('💬 API /api/radio_comments: /api/radio_comments');
  console.log('🎧 API /api/podcast_comments: /api/podcast_comments');
  console.log('🎙️ API /api/podcasts/episodes: /api/podcasts/episodes');
  console.log('💚 Health check: /health');
  // Start live listeners updates
  try { ensureListenersInitialized(); } catch {}
  startListenersTimer();
});
