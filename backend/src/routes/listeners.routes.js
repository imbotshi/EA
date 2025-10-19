import express from 'express';
import { addSSEClient, getSnapshot, removeSSEClient } from '../services/listeners.service.js';

const router = express.Router();

router.get('/stations/listeners', (req, res) => {
  try {
    const snapshot = getSnapshot();
    res.json(snapshot);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get listeners' });
  }
});

router.get('/stations/listeners/stream', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    addSSEClient(res);

    const initial = JSON.stringify(getSnapshot());
    res.write(`event: listeners\n`);
    res.write(`data: ${initial}\n\n`);

    req.on('close', () => {
      try { removeSSEClient(res); } catch {}
    });
  } catch (e) {
    res.status(500).end();
  }
});

export default router;
