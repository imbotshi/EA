import express from 'express';
import { readStationsList } from '../services/stations.service.js';
import { addSSEClient, getSnapshot } from '../services/listeners.service.js';

const router = express.Router();

router.get('/stations', (req, res) => {
  try {
    const stations = readStationsList();
    const snapshot = getSnapshot();
    const withListeners = stations.map((s) => {
      const id = s.id || s.slug || s.name;
      const listeners = snapshot.listeners[id] ?? (typeof s.listeners === 'number' ? s.listeners : 0);
      return { ...s, listeners };
    });
    res.json(withListeners);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

export default router;
