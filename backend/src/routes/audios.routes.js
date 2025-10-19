import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PATHS } from '../config/paths.js';
import { readJSON, writeJSON, safeUnlink } from '../utils/fileStore.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PATHS.AUDIO_DIR);
  },
  filename: function (req, file, cb) {
    const m = (file.mimetype || '').toLowerCase();
    const ext = m.includes('wav') ? '.wav' : m.includes('ogg') ? '.ogg' : m.includes('webm') ? '.webm' : (m.includes('mp3') || m.includes('mpeg')) ? '.mp3' : (path.extname(file.originalname || '') || '.dat');
    const safeBase = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${safeBase}${ext}`);
  }
});
const upload = multer({ storage });

router.get('/audios', (req, res) => {
  try {
    const p = path.join(PATHS.API_DIR, 'audios.json');
    const list = readJSON(p, []);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read audios' });
  }
});

router.post('/audios', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

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
      coordinates: [latNum || 0, lngNum || 0],
      lat: latNum || 0,
      lng: lngNum || 0,
      duration: duration || null,
      timestamp: new Date().toISOString(),
      description: description || '',
      audioUrl: fileUrl,
      category: category || 'Général'
    };

    const p = path.join(PATHS.API_DIR, 'audios.json');
    let list = readJSON(p, []);

    // Enforce 1 audio per user
    const userAudios = list.filter(a => a.userId === note.userId || (a.user === note.user && (note.user === 'Éclaireur' || note.user === 'Utilisateur')));
    for (const old of userAudios) {
      const idx = list.findIndex(a => a.id === old.id);
      if (idx > -1) list.splice(idx, 1);
      if (old.audioUrl) {
        const oldPath = path.join(PATHS.PUBLIC_DIR, old.audioUrl.replace(/^\//, ''));
        safeUnlink(oldPath);
      }
    }

    list.unshift(note);
    writeJSON(p, list);

    res.json({ ok: true, note });
  } catch (e) {
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

router.delete('/audios/:id', (req, res) => {
  try {
    const id = req.params.id;
    const p = path.join(PATHS.API_DIR, 'audios.json');
    let list = readJSON(p, []);
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Audio not found' });
    const item = list[idx];
    list.splice(idx, 1);
    writeJSON(p, list);
    if (item.audioUrl) {
      const filePath = path.join(PATHS.PUBLIC_DIR, item.audioUrl.replace(/^\//, ''));
      safeUnlink(filePath);
    }
    res.json({ ok: true, deletedId: id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

router.patch('/audios/:id/position', (req, res) => {
  try {
    const id = req.params.id;
    const { lat, lng, timestamp } = req.body || {};
    if (!isFinite(parseFloat(lat)) || !isFinite(parseFloat(lng))) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    const p = path.join(PATHS.API_DIR, 'audios.json');
    let list = readJSON(p, []);
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Audio not found' });
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    list[idx].lat = latNum;
    list[idx].lng = lngNum;
    list[idx].coordinates = [latNum, lngNum];
    list[idx].lastPositionUpdate = timestamp || new Date().toISOString();
    writeJSON(p, list);
    res.json({ ok: true, audioId: id, lat: latNum, lng: lngNum });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// Report an audio note (store in reports/audio_reports.json)
router.post('/audios/report', (req, res) => {
  try {
    const { audioId, reporterId, reason } = req.body || {};
    if (!audioId || !reporterId) {
      return res.status(400).json({ error: 'Missing audioId or reporterId' });
    }
    const report = {
      id: Date.now().toString(),
      audioId,
      reporterId,
      reason: reason || 'inappropriate',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    const p = path.join(PATHS.REPORTS_DIR, 'audio_reports.json');
    const reports = readJSON(p, []);
    reports.unshift(report);
    writeJSON(p, reports);
    res.json({ ok: true, reportId: report.id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to report audio' });
  }
});

export default router;
