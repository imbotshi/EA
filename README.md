# 🎵 Eclairia - Plateforme Audio Interactive

> Plateforme audio immersive combinant radio africaine, enregistrement vocal géolocalisé, podcasts et interface 3D interactive.

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-Latest-000000?logo=three.js)](https://threejs.org/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify)](https://netlify.com/)

## 🚀 Stack Technique

### Frontend
- **Framework**: Vue 3.5 + Composition API
- **Build Tool**: Vite 7.0
- **Styling**: Tailwind CSS 3.4
- **3D Graphics**: Three.js 0.178
- **Audio**: Wavesurfer.js 7.10
- **Maps**: Leaflet + OpenStreetMap
- **State Management**: Pinia 3.0

### Backend & Services
- **API Server**: Node.js + Express 4.21
- **Database**: Supabase (PostgreSQL)
- **Audio Proxy**: CORS-enabled streaming proxy
- **File Upload**: Multer (audio files)
- **RSS Parsing**: RSS-Parser 3.13

### Deployment
- **Platform**: Netlify (Serverless Functions)
- **Domain**: eclairia.io
- **CDN**: Global edge network
- **SSL**: Automatic HTTPS

## 📦 Installation

```bash
# Installer les dépendances backend
npm install

# Installer les dépendances frontend
cd frontend
npm install
```

## 🛠️ Développement

### Option 1: Backend + Frontend séparés (recommandé)
```bash
# Terminal 1 - Backend (port 3001)
npm run dev:server

# Terminal 2 - Frontend (port 3000)
npm run dev:client
```

### Option 2: Backend seulement
```bash
npm run dev
```

## 🌐 URLs de développement

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
  - `/proxy?url=...` - Proxy audio
  - `/api/stations` - Liste des stations radio
  - `/health` - Health check

## 🚀 Déploiement

Le projet est configuré pour un déploiement statique sur Vercel :

```bash
# Build de production
npm run build

# Preview locale
cd frontend
npm run preview
```

## 📁 Structure

```
├── server.js              # API backend (proxy + stations)
├── package.json           # Dépendances backend
├── frontend/              # Application Vue/Vite
│   ├── src/
│   │   ├── components/    # Composants Vue
│   │   ├── services/      # Services API
│   │   ├── composables/   # Composables Vue
│   │   └── router/        # Configuration router
│   ├── public/
│   │   └── api/           # Données statiques (stations.json)
│   └── package.json       # Dépendances frontend
└── vercel.json           # Configuration déploiement Vercel
```

## 🔧 Configuration

### Variables d'environnement

Créer `.env` dans `frontend/` :
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Configuration (optionnel)
VITE_API_BASE_URL=http://localhost:3001

# Performance Settings (optionnel)
VITE_ENABLE_PERFORMANCE_MONITOR=true
VITE_MAX_CONCURRENT_STREAMS=1
```

### Configuration Netlify

Le projet utilise `netlify.toml` pour la configuration de déploiement :
- **Build Command**: `cd frontend && npm run build`
- **Publish Directory**: `frontend/dist`
- **Functions Directory**: `netlify/functions`
- **Redirects**: SPA routing + CORS headers

## ✨ Fonctionnalités Principales

### 📻 Radio Interactive
- **14 stations africaines** validées et optimisées
- **Proxy CORS** pour streaming sans blocage
- **Contrôle audio avancé** avec gestion d'erreurs
- **Compteurs d'auditeurs** en temps réel (SSE)
- **Interface SiriSphere** 3D pour navigation

### 🎙️ Enregistrement Géolocalisé
- **Capture audio** avec permissions microphone
- **Géolocalisation GPS** temps réel
- **Carte interactive** OpenStreetMap
- **Système de commentaires** vocaux
- **Contrainte utilisateur** (1 audio par utilisateur)

### 🎧 Podcasts
- **Flux RSS** automatique des derniers épisodes
- **Cache intelligent** (15min TTL)
- **Métadonnées complètes** (durée, image, description)
- **Système de commentaires** vocaux intégré

### 🌍 Interface 3D
- **SiriSphere** interactive avec Three.js
- **Optimisations mobiles** anti-surchauffe
- **LOD System** adaptatif (3 niveaux)
- **Performance Monitor** temps réel
- **Gestion textures** progressive

## 🏗️ Architecture

### Structure des Composants
```
frontend/src/
├── components/           # Composants Vue réutilisables
│   ├── SiriSphere.vue   # Interface 3D principale
│   ├── VoiceMapOpenStreet.vue  # Carte géolocalisée
│   ├── PodcastPlayer.vue       # Lecteur podcast
│   └── RadioStationDetail.vue  # Détail station radio
├── services/            # Services API et logique métier
│   ├── audioGeoService.js     # Géolocalisation audio
│   ├── radioApi.js           # API stations radio
│   └── podcastApi.js         # API podcasts RSS
├── utils/              # Utilitaires et managers
│   ├── audioManager.js      # Gestion flux audio
│   ├── performanceMonitor.js # Monitoring performance
│   └── lodManager.js        # Level of Detail
└── composables/        # Logique réutilisable Vue
    ├── useRadio.js         # État radio global
    └── useLongPress.js     # Détection appui long
```

### Flux de Données
1. **Frontend** (Vue 3) ↔ **Backend** (Express) ↔ **Stations Radio**
2. **GPS Service** → **Audio Upload** → **Map Markers**
3. **RSS Parser** → **Episode Cache** → **Podcast UI**
4. **Performance Monitor** → **LOD Manager** → **3D Optimizations**

## 🐛 Dépannage

### Problèmes Audio
- **CORS Errors**: Vérifier l'allowlist dans `server.js` (ligne 431-475)
- **Flux coupés**: Contrôler la qualité réseau et retry automatique
- **Surchauffe mobile**: Le système LOD s'active automatiquement

### Problèmes de Performance
- **FPS bas**: Performance Monitor active les optimisations automatiques
- **Mémoire élevée**: Nettoyage automatique des textures et géométries
- **Chargement lent**: Système de cache et chargement progressif

### Problèmes de Géolocalisation
- **Permissions**: Vérifier l'autorisation GPS dans le navigateur
- **Précision**: Attendre stabilisation GPS (3-5 secondes)
- **Markers manquants**: Vérifier la structure `audios.json`

## 📊 Monitoring & Métriques

### Performance
- **FPS Target**: 60 (desktop) / 30 (mobile)
- **Memory Limit**: 100MB JavaScript heap
- **Texture Budget**: 8MB (optimisé)
- **LOD Levels**: Low (32 segments) / Medium (64) / High (128)

### Audio
- **Concurrent Streams**: 1 maximum (anti-surchauffe)
- **Retry Logic**: 3 tentatives avec délai exponentiel
- **Connection Quality**: Détection automatique (downlink)
- **Proxy Timeout**: 15 secondes

## 🔒 Sécurité

### CORS Policy
- Allowlist stricte des domaines audio (75 domaines validés)
- Headers sécurisés pour streaming
- Validation des URLs avant proxy

### Upload Audio
- Validation MIME types (wav, mp3, ogg, webm)
- Nettoyage automatique des anciens fichiers
- Contrainte 1 audio par utilisateur
- Système de signalement intégré

## 🚀 Optimisations Appliquées

### Mobile Performance
- **Géométrie réduite**: 32x32 segments (-94% triangles)
- **Particules limitées**: 25 vs 200 (-87%)
- **FPS throttling**: 30 FPS forcé (-50% CPU)
- **Textures progressives**: Low → Medium → High

### Network Optimization
- **Audio proxy**: Évite les redirections multiples
- **RSS Cache**: 15min TTL pour réduire les requêtes
- **Lazy loading**: Composants et textures à la demande
- **Connection detection**: Adaptation qualité automatique 