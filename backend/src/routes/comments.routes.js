import express from 'express';
import multer from 'multer';
import path from 'path';
import { PATHS } from '../config/paths.js';
import { readJSON, writeJSON } from '../utils/fileStore.js';

const router = express.Router();

const commentsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PATHS.COMMENTS_AUDIO_DIR);
  },
  filename: function (req, file, cb) {
    const m = (file.mimetype || '').toLowerCase();
    const ext = m.includes('wav') ? '.wav' : m.includes('ogg') ? '.ogg' : m.includes('webm') ? '.webm' : (path.extname(file.originalname || '') || '.dat');
    const safeBase = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${safeBase}${ext}`);
  }
});
const uploadComment = multer({ storage: commentsStorage });

router.get('/radio_comments', (req, res) => {
  try {
    const p = path.join(PATHS.API_DIR, 'radio_comments.json');
    const map = readJSON(p, {});
    res.json(map);
  } catch {
    res.status(500).json({ error: 'Failed to load radio comments' });
  }
});

router.post('/radio_comments', uploadComment.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { stationId, duration } = req.body || {};
    if (!stationId) return res.status(400).json({ error: 'Missing stationId' });

    const entry = {
      id: Date.now(),
      userName: req.header('x-client-machine-id') || (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || req.ip || 'unknown',
      userAvatar: '/icon-ios.svg',
      audioUrl: `/comments_audio/${req.file.filename}`,
      duration: isFinite(parseInt(duration, 10)) ? parseInt(duration, 10) : null,
      timestamp: new Date().toISOString(),
      isOwn: true
    };
    const p = path.join(PATHS.API_DIR, 'radio_comments.json');
    const map = readJSON(p, {});
    if (!map[stationId]) map[stationId] = [];
    map[stationId].push(entry);
    writeJSON(p, map);
    res.json({ ok: true, comment: entry });
  } catch {
    res.status(500).json({ error: 'Failed to save radio comment' });
  }
});

router.get('/podcast_comments', (req, res) => {
  try {
    const p = path.join(PATHS.API_DIR, 'podcast_comments.json');
    const map = readJSON(p, {});
    res.json(map);
  } catch {
    res.status(500).json({ error: 'Failed to load podcast comments' });
  }
});

router.post('/podcast_comments', uploadComment.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { podcastId, duration } = req.body || {};
    if (!podcastId) return res.status(400).json({ error: 'Missing podcastId' });

    const entry = {
      id: Date.now(),
      userName: req.header('x-client-machine-id') || (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || req.ip || 'unknown',
      userAvatar: '/icon-ios.svg',
      audioUrl: `/comments_audio/${req.file.filename}`,
      duration: isFinite(parseInt(duration, 10)) ? parseInt(duration, 10) : null,
      timestamp: new Date().toISOString(),
      isOwn: true
    };
    const p = path.join(PATHS.API_DIR, 'podcast_comments.json');
    const map = readJSON(p, {});
    if (!map[podcastId]) map[podcastId] = [];
    map[podcastId].push(entry);
    writeJSON(p, map);
    res.json({ ok: true, comment: entry });
  } catch {
    res.status(500).json({ error: 'Failed to save podcast comment' });
  }
});

export default router;
