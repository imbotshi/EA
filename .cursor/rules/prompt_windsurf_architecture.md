# 🧠 Prompt Windsurf — Séparation Backend / Frontend (Architecture Pro)

## 🎯 Objectif
Mon projet est actuellement monolithique.  
Je veux que tu le restructures pour **séparer proprement le frontend et le backend** selon les **meilleures pratiques d’architecture logicielle**.

---

## ⚙️ Structure attendue

### 1. Dossiers principaux
- `/frontend` → Application client (React ou Vue, selon la stack détectée)
- `/backend` → API REST ou GraphQL (Node.js / Express / NestJS selon la stack)

---

## 💡 Exigences détaillées

### **Backend**
- Organisation modulaire :
  ```
  backend/
  ├── src/
  │   ├── controllers/
  │   ├── services/
  │   ├── models/
  │   ├── routes/
  │   ├── config/
  │   └── utils/
  ├── database/
  ├── .env.example
  ├── package.json
  └── server.js
  ```
- Intégrer un système d’environnement avec `.env`.
- Ajouter une base de données (MongoDB ou PostgreSQL selon les dépendances).
- Créer un fichier `server.js` ou `main.ts` bien commenté.
- Respecter une approche **Clean Architecture** ou **Domain Driven Design**.

---

### **Frontend**
- Organisation claire :
  ```
  frontend/
  ├── src/
  │   ├── components/
  │   ├── pages/
  │   ├── layouts/
  │   ├── services/api/
  │   ├── assets/
  │   └── main.js
  ├── vite.config.js (ou webpack.config.js)
  ├── package.json
  ```
- Prévoir un système d’appels API vers le backend (Axios ou Fetch).
- Configurer un proxy local pour le développement.

---

### **Documentation**
- Créer un dossier :
  ```
  docs/architecture/
  ```
  Contenant :
  - `architecture-diagram.png` : schéma de la nouvelle structure
  - `README.md` : instructions pour lancer chaque partie  
    Exemple :
    ```bash
    # Backend
    cd backend && npm install && npm run dev

    # Frontend
    cd frontend && npm install && npm run dev
    ```

---

### **Automatisation**
- Créer un script global `setup.sh` ou un `Makefile` pour :
  - Installer toutes les dépendances
  - Lancer les deux environnements (frontend + backend)

---

## ✅ Résultat attendu
- Deux environnements **indépendants mais connectés**
- Une **architecture claire, scalable et maintenable**
- Deux `package.json` séparés
- Un **README global** décrivant l’organisation, la logique et la philosophie de l’architecture appliquée

---

## 📄 Sortie demandée
Fournis :
1. L’arborescence finale complète des dossiers
2. Les fichiers générés avec leur contenu principal
3. Un résumé clair de la logique d’architecture mise en place
