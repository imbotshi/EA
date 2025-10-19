# Eclairia Architecture (Frontend/Backend Separation)

This document describes the new split architecture for Eclairia with independent Frontend (Vue 3 + Vite) and Backend (Express).

## Structure

```
Eclairia/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── paths.js
│       ├── routes/
│       │   ├── audios.routes.js
│       │   ├── comments.routes.js
│       │   ├── listeners.routes.js
│       │   ├── podcasts.routes.js
│       │   ├── proxy.routes.js
│       │   └── stations.routes.js
│       ├── services/
│       │   ├── listeners.service.js
│       │   └── stations.service.js
│       └── utils/
│           └── fileStore.js
├── frontend/
│   ├── vite.config.js (proxy: /api, /proxy, /audio, /comments_audio -> :3001)
│   └── ...
└── docs/
    └── architecture/
        ├── README.md
        └── architecture-diagram.mmd
```

## How to run (development)

- Backend
  - `cd backend`
  - `npm install`
  - `npm run dev` (default port 3001)

- Frontend
  - `cd frontend`
  - `npm install`
  - `npm run dev` (port 3000)

Vite proxies API and uploads to the backend:
- `/api/*`, `/proxy` -> `http://localhost:3001`
- `/audio/*`, `/comments_audio/*` -> `http://localhost:3001`

## Data and uploads

- JSON data files are stored under `backend/data/api/*.json`:
  - `audios.json`, `radio_comments.json`, `podcast_comments.json`
- Uploaded files:
  - Audio notes: `backend/public/audio/*` served at `/audio/*`
  - Comments audio: `backend/public/comments_audio/*` served at `/comments_audio/*`
- Stations and podcasts lists are read from existing files in `frontend/public/api/` for now (to keep compatibility). You can later migrate them into `backend/data/api/` if desired.

## API overview

- Stations
  - `GET /api/stations`
  - `GET /api/stations/listeners`
  - `GET /api/stations/listeners/stream` (SSE)
- Audio notes
  - `GET /api/audios`
  - `POST /api/audios` (multipart: file, title, user, userId, duration, lat, lng, description, category)
  - `DELETE /api/audios/:id`
  - `PATCH /api/audios/:id/position`
- Comments
  - `GET/POST /api/radio_comments`
  - `GET/POST /api/podcast_comments`
- Podcasts
  - `GET /api/podcasts`
  - `GET /api/podcasts/episodes`
- Proxy
  - `GET /proxy?url=...` (allowlist enforced)
- Health
  - `GET /health`

## Notes

- One-audio-per-user constraint is enforced in the backend when uploading a new audio.
- SSE pushes live listeners updates every 10s.
- Episodes responses are cached in-memory (default TTL 15 minutes).
- Configure environment via `backend/.env` (see `.env.example`).

## Diagram

See `architecture-diagram.mmd` (Mermaid). Export to PNG as needed.
