# 🚀 ECLAIRIA - API Express PRD
## Architecture Backend et Connectivité Projet

---

## 📖 Table des Matières

1. [Vue d'ensemble de l'API](#-vue-densemble-de-lapi)
2. [Architecture technique](#-architecture-technique)
3. [Endpoints et fonctionnalités](#-endpoints-et-fonctionnalités)
4. [Système de proxy audio](#-système-de-proxy-audio)
5. [Gestion des stations radio](#-gestion-des-stations-radio)
6. [Sécurité et CORS](#-sécurité-et-cors)
7. [Intégration frontend](#-intégration-frontend)
8. [Déploiement et configuration](#-déploiement-et-configuration)
9. [Monitoring et logs](#-monitoring-et-logs)
10. [Roadmap API](#-roadmap-api)

---

## 🎯 Vue d'ensemble de l'API

### **Mission**
L'API Express d'Eclairia sert de pont intelligent entre le frontend Vue.js et les services audio externes, fournissant un proxy sécurisé, une gestion des stations radio et une architecture scalable pour la plateforme audio interactive.

### **Rôle dans l'écosystème**
- **Proxy audio intelligent** : Sécurisation et optimisation des flux radio
- **API de données** : Gestion centralisée des stations et métadonnées
- **Middleware de sécurité** : Protection CORS et validation des domaines
- **Serveur statique** : Hébergement du frontend compilé

### **Objectifs techniques**
- **Performance** : Latence minimale pour le streaming audio
- **Sécurité** : Protection contre les attaques et domaines malveillants
- **Scalabilité** : Architecture modulaire pour la croissance
- **Fiabilité** : Gestion d'erreur robuste et monitoring

---

## 🏗️ Architecture technique

### **Stack technologique**
```
Backend Core :
├── Node.js (v20.14.0+)
├── Express.js (v4.19.2+)
├── ES Modules (import/export)
└── Async/Await patterns

Dépendances :
├── cors (v2.8.5) - Gestion CORS
├── node-fetch (v3.3.2) - Requêtes HTTP
└── path, fs - Gestion fichiers

Infrastructure :
├── Serveur HTTP natif
├── Middleware Express
├── Gestion statique
└── Routing intelligent
```

### **Architecture des composants**
```
server.js (Point d'entrée principal)
├── Configuration Express
├── Middleware CORS
├── Gestion fichiers statiques
├── Routes API
├── Proxy audio
├── Gestion erreurs
└── Démarrage serveur

Modules fonctionnels :
├── ProxyService - Gestion des flux audio
├── StationService - API des stations radio
├── SecurityService - Validation et sécurité
├── LoggingService - Monitoring et logs
└── StaticService - Fichiers frontend
```

### **Structure des dossiers**
```
/
├── server.js              # Point d'entrée API
├── package.json           # Dépendances backend
├── package-lock.json      # Verrouillage versions
├── frontend/              # Application Vue.js
│   ├── dist/              # Build de production
│   ├── public/api/        # Données statiques
│   │   └── stations.json  # Stations radio
│   └── src/               # Code source Vue
└── node_modules/          # Dépendances installées
```

---

## 🔌 Endpoints et fonctionnalités

### **1. Proxy Audio (`/proxy`)**
```http
GET /proxy?url={URL_STATION}

Fonctionnalités :
├── Validation des domaines autorisés
├── Proxy intelligent des flux audio
├── Gestion des headers CORS
├── Streaming en temps réel
├── Gestion d'erreur robuste
└── Logs détaillés des connexions

Paramètres :
├── url (requis) : URL du flux audio
└── format : auto-détection du type MIME

Réponse :
├── 200 : Flux audio streamé
├── 400 : URL manquante
├── 403 : Domaine non autorisé
└── 500 : Erreur serveur
```

### **2. API Stations (`/api/stations`)**
```http
GET /api/stations

Fonctionnalités :
├── Lecture des données JSON
├── Cache en mémoire
├── Gestion d'erreur
└── Logs de performance

Réponse :
├── 200 : Array des stations radio
├── 500 : Erreur de lecture
└── Content-Type: application/json

Structure des données :
{
  "stations": [
    {
      "id": "string",
      "name": "string",
      "url": "string",
      "country": "string",
      "language": "string",
      "genre": "string"
    }
  ]
}
```

### **3. Health Check (`/health`)**
```http
GET /health

Fonctionnalités :
├── Vérification statut serveur
├── Timestamp de réponse
├── Version de l'API
└── Monitoring externe

Réponse :
{
  "ok": true,
  "timestamp": 1703123456789,
  "service": "Eclairia Radio API",
  "version": "1.0.0"
}
```

### **4. Fallback SPA (`/*`)**
```http
GET /* (toutes autres routes)

Fonctionnalités :
├── Support Vue Router
├── Routing côté serveur
├── Fichiers statiques
└── Gestion SPA
```

---

## 🎵 Système de proxy audio

### **Architecture du proxy**
```
Client (Frontend) → API Express → Station Radio Externe
     ↑                    ↓              ↓
     ←─────────── Proxy Response ←─── Audio Stream
```

### **Processus de proxy**
1. **Réception requête** : URL de station depuis le frontend
2. **Validation domaine** : Vérification contre la whitelist
3. **Connexion externe** : Fetch vers la station radio
4. **Streaming** : Pipe direct de la réponse audio
5. **Headers CORS** : Configuration pour le frontend
6. **Logs** : Traçabilité complète des connexions

### **Whitelist des domaines autorisés**
```javascript
const ALLOWLIST = [
  'rfifm64k.ice.infomaniak.ch',      // Radio France International
  'african1paris.ice.infomaniak.ch',  // African Radio Paris
  'dreamsiteradiocp4.com',            // Dreams Radio
  'stream.live.vc.bbcmedia.co.uk',    // BBC Media
  'scdn.nrjaudio.fm',                 // NRJ Audio
  'radio-trace.ice.infomaniak.ch',    // Radio Trace
  'www.soundhelix.com',               // SoundHelix
  'rmc.bfmtv.com',                    // RMC BFM
  'radio.garden',                     // Radio Garden
  'stream.zeno.fm'                    // Zeno FM
];
```

### **Sécurité du proxy**
- **Validation URL** : Parsing et vérification des domaines
- **Whitelist stricte** : Seuls les domaines autorisés
- **Headers sécurisés** : User-Agent personnalisé
- **Gestion d'erreur** : Fallback gracieux
- **Logs de sécurité** : Traçabilité des tentatives

---

## 📡 Gestion des stations radio

### **Source des données**
```javascript
// Lecture depuis le fichier JSON statique
const stationsPath = path.join(__dirname, 'frontend/public/api/stations.json');
const stationsData = fs.readFileSync(stationsPath, 'utf8');
const stations = JSON.parse(stationsData);
```

### **Structure des données**
```json
{
  "stations": [
    {
      "id": "cm-douala-1",
      "name": "Radio Douala",
      "url": "https://stream.zeno.fm/...",
      "country": "Cameroun",
      "city": "Douala",
      "language": "Français",
      "genre": "Général",
      "favicon": "/flags/cm.svg",
      "description": "Station locale de Douala",
      "quality": "Excellente",
      "listeners": 15000
    }
  ]
}
```

### **API de gestion**
- **Lecture** : GET `/api/stations`
- **Cache** : Données en mémoire
- **Validation** : Structure JSON
- **Performance** : Réponse < 100ms
- **Monitoring** : Logs de requêtes

---

## 🔒 Sécurité et CORS

### **Configuration CORS**
```javascript
// Middleware CORS global
app.use(cors());

// Headers CORS spécifiques pour le proxy
res.set('Access-Control-Allow-Origin', '*');
res.set('Access-Control-Allow-Headers', '*');
```

### **Sécurité des domaines**
- **Whitelist stricte** : Seuls les domaines autorisés
- **Validation URL** : Parsing et vérification
- **User-Agent** : Identification de l'API
- **Headers sécurisés** : Protection contre les attaques
- **Rate limiting** : Protection contre le spam

### **Gestion des erreurs**
```javascript
try {
  // Logique métier
} catch (error) {
  console.error('💥 Erreur:', error.message);
  res.status(500).send('Error message');
}
```

---

## 🔗 Intégration frontend

### **Connexion Vue.js → Express**
```javascript
// Dans le frontend Vue.js
const API_BASE = 'http://localhost:3001';

// Appel API stations
const response = await fetch(`${API_BASE}/api/stations`);
const stations = await response.json();

// Appel proxy audio
const audioUrl = `${API_BASE}/proxy?url=${encodeURIComponent(stationUrl)}`;
```

### **Configuration des URLs**
```javascript
// frontend/src/config/api.js
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.eclairia.com' 
    : 'http://localhost:3001',
  
  ENDPOINTS: {
    STATIONS: '/api/stations',
    PROXY: '/proxy',
    HEALTH: '/health'
  }
};
```

### **Gestion des erreurs côté client**
```javascript
// Intercepteur d'erreurs global
const handleApiError = (error) => {
  if (error.status === 403) {
    console.error('Domaine non autorisé');
  } else if (error.status === 500) {
    console.error('Erreur serveur');
  }
};
```

---

## 🚀 Déploiement et configuration

### **Variables d'environnement**
```bash
# .env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://eclairia.com
LOG_LEVEL=info
```

### **Scripts de démarrage**
```json
{
  "scripts": {
    "dev": "node server.js",
    "dev:server": "node server.js",
    "start": "node server.js",
    "build": "cd frontend && npm run build",
    "build:start": "npm run build && npm start"
  }
}
```

### **Configuration de production**
```javascript
// Configuration conditionnelle
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Logs adaptés à l'environnement
if (NODE_ENV === 'production') {
  // Logs minimaux en production
} else {
  // Logs détaillés en développement
}
```

---

## 📊 Monitoring et logs

### **Système de logging**
```javascript
// Logs structurés avec emojis
console.log('🎵 Tentative de connexion:', targetUrl);
console.log('✅ Flux connecté:', contentType);
console.log('❌ Erreur flux:', response.status);
console.log('💥 Erreur proxy:', err.message);
```

### **Métriques de performance**
- **Temps de réponse** : < 100ms pour les API
- **Latence proxy** : < 2s pour l'audio
- **Uptime** : 99.9% disponibilité
- **Erreurs** : < 1% de taux d'erreur

### **Monitoring en temps réel**
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});
```

---

## 🗺️ Roadmap API

### **Phase 1 : Stabilisation (Q1 2024)**
- [x] Architecture de base Express
- [x] Proxy audio sécurisé
- [x] API stations radio
- [x] Configuration CORS
- [ ] Tests unitaires
- [ ] Documentation OpenAPI

### **Phase 2 : Fonctionnalités avancées (Q2 2024)**
- [ ] Cache Redis pour les stations
- [ ] Rate limiting avancé
- [ ] Authentification JWT
- [ ] API de gestion des utilisateurs
- [ ] WebSocket pour temps réel
- [ ] Compression audio

### **Phase 3 : Échelle et performance (Q3 2024)**
- [ ] Load balancing
- [ ] Microservices architecture
- [ ] CDN pour l'audio
- [ ] Monitoring Prometheus
- [ ] Logs centralisés ELK
- [ ] Auto-scaling

### **Phase 4 : Innovation (Q4 2024)**
- [ ] IA pour recommandations
- [ ] Analytics avancés
- [ ] API publique
- [ ] Webhooks
- [ ] GraphQL
- [ ] Serverless functions

---

## 🔧 Guide de connexion

### **1. Installation des dépendances**
```bash
# Installation backend
npm install

# Installation frontend
cd frontend
npm install
```

### **2. Configuration des ports**
```javascript
// Backend : port 3001
// Frontend : port 3000 (développement)
// Production : même port (3001)
```

### **3. Démarrage du projet**
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

### **4. Test de connectivité**
```bash
# Test API
curl http://localhost:3001/health

# Test proxy
curl "http://localhost:3001/proxy?url=https://stream.zeno.fm/..."

# Test stations
curl http://localhost:3001/api/stations
```

### **5. Intégration dans le code**
```javascript
// Exemple d'utilisation complète
import { API_CONFIG } from '@/config/api';

class RadioService {
  async getStations() {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STATIONS}`);
    return response.json();
  }
  
  async playStation(stationUrl) {
    const proxyUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PROXY}?url=${encodeURIComponent(stationUrl)}`;
    return new Audio(proxyUrl);
  }
}
```

---

## 🎯 Conclusion

L'API Express d'Eclairia constitue le **cœur technique** de la plateforme, offrant :

### **Valeur technique**
- **Proxy audio sécurisé** avec whitelist stricte
- **API RESTful** pour la gestion des stations
- **Architecture scalable** et modulaire
- **Sécurité renforcée** avec CORS et validation

### **Intégration parfaite**
- **Connexion transparente** frontend ↔ backend
- **Gestion d'erreur robuste** côté client et serveur
- **Performance optimisée** pour le streaming audio
- **Monitoring complet** avec logs structurés

### **Évolutivité**
- **Roadmap claire** pour les fonctionnalités futures
- **Architecture modulaire** pour l'extension
- **Standards ouverts** pour l'intégration
- **Documentation complète** pour les développeurs

---

*Document créé le : Décembre 2024*  
*Version : 1.0*  
*Statut : En développement actif*  
*Responsable technique : Équipe Eclairia Backend*
