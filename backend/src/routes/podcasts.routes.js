import express from 'express';
import fs from 'fs';
import path from 'path';
import RSSParser from 'rss-parser';
import { PATHS } from '../config/paths.js';

const router = express.Router();
const rssParser = new RSSParser({ timeout: 10000, headers: { 'User-Agent': 'Eclairia-Podcast-Fetcher/1.0' } });

const episodesCache = {
  data: null,
  timestamp: 0,
  ttlMs: parseInt(process.env.EPISODES_TTL_MS || '900000', 10)
};

function parseDurationToSeconds(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && isFinite(raw)) return Math.max(0, Math.floor(raw));
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) return Math.max(0, parseInt(str, 10));
  const parts = str.split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) { const [h, m, s] = parts; return (h * 3600) + (m * 60) + s; }
  if (parts.length === 2) { const [m, s] = parts; return (m * 60) + s; }
  if (parts.length === 1) return Math.max(0, parts[0] || 0);
  return null;
}

router.get('/podcasts', (req, res) => {
  try {
    const p = path.join(PATHS.FRONT_API_DIR, 'podcasts.json');
    const raw = fs.readFileSync(p, 'utf8');
    const list = JSON.parse(raw || '[]');
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load podcasts' });
  }
});

router.get('/podcasts/episodes', async (req, res) => {
  try {
    const now = Date.now();
    if (episodesCache.data && (now - episodesCache.timestamp) < episodesCache.ttlMs) {
      res.set('X-Eclairia-Cache', 'HIT');
      return res.json(episodesCache.data);
    }

    const p = path.join(PATHS.FRONT_API_DIR, 'podcasts.json');
    const raw = fs.readFileSync(p, 'utf8');
    const feeds = JSON.parse(raw || '[]');

    const results = await Promise.allSettled(
      feeds.map(async (f) => {
        try {
          const feed = await rssParser.parseURL(f.rss);
          const latest = Array.isArray(feed.items) && feed.items.length ? feed.items[0] : null;
          if (!latest) {
            return { feedId: f.id || null, feedTitle: f.title || feed?.title || 'Podcast', rss: f.rss, episode: null };
          }
          const audioUrl = latest.enclosure?.url || latest.enclosures?.[0]?.url || latest.itunes?.episodeUrl || null;
          const image = latest.itunes?.image || feed.image?.url || null;
          const description = latest.contentSnippet || latest.content || latest.summary || '';
          const published = latest.isoDate || latest.pubDate || null;
          const duration = parseDurationToSeconds(latest.itunes?.duration) ?? null;
          return { feedId: f.id || null, feedTitle: f.title || feed.title || 'Podcast', rss: f.rss, episode: { title: latest.title || 'Episode', audioUrl, image, description, published, duration } };
        } catch (e) {
          return { feedId: f.id || null, feedTitle: f.title || 'Podcast', rss: f.rss, error: e?.message || 'Failed to parse RSS', episode: null };
        }
      })
    );

    const normalized = results.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Unknown error' }));
    episodesCache.data = normalized;
    episodesCache.timestamp = now;
    res.set('X-Eclairia-Cache', 'MISS');
    res.json(normalized);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load podcast episodes' });
  }
});

export default router;
