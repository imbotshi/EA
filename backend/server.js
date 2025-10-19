import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { ensureAppPaths, PATHS } from './src/config/paths.js';
import stationsRouter from './src/routes/stations.routes.js';
import listenersRouter from './src/routes/listeners.routes.js';
import audiosRouter from './src/routes/audios.routes.js';
import commentsRouter from './src/routes/comments.routes.js';
import podcastsRouter from './src/routes/podcasts.routes.js';
import proxyRouter from './src/routes/proxy.routes.js';
import { startListeners } from './src/services/listeners.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories and seed files exist
ensureAppPaths();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static serving for uploaded audio/comments
app.use('/audio', express.static(PATHS.AUDIO_DIR));
app.use('/comments_audio', express.static(PATHS.COMMENTS_AUDIO_DIR));
// Fallback to legacy frontend/public in dev or during transition
app.use('/audio', express.static(path.join(PATHS.ROOT_DIR, 'frontend', 'public', 'audio')));
app.use('/comments_audio', express.static(path.join(PATHS.ROOT_DIR, 'frontend', 'public', 'comments_audio')));

// API routes
app.use('/api', stationsRouter);
app.use('/api', listenersRouter);
app.use('/api', audiosRouter);
app.use('/api', commentsRouter);
app.use('/api', podcastsRouter);
app.use('/', proxyRouter); // /proxy

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'Eclairia Backend API', ts: Date.now() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Eclairia backend listening on http://localhost:${PORT}`);
  console.log('Routes: /api/stations, /api/audios, /api/podcasts, /proxy');
  startListeners();
});
