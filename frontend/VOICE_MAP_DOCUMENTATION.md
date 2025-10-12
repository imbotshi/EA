# 📍 Documentation de l'Onglet Voice - Eclairia

## Vue d'ensemble

L'onglet **Voice** de l'application Eclairia affiche une carte interactive personnalisée qui montre la localisation géographique de différents types de contenu audio :

- 📻 **Stations Radio** : Basées sur les données de radio.garden
- 🎧 **Podcasts** : Contenu audio thématique
- 🎤 **Notes Vocales** : Enregistrements des utilisateurs

## 🗺️ Fonctionnalités de la Carte

### Carte Interactive
- **Technologie** : Leaflet (OpenStreetMap)
- **Zoom** : Niveaux 10-18 (vue d'ensemble à détail par quartier)
- **Centre par défaut** : Douala, Cameroun
- **Styles** : Adaptation automatique jour/nuit

### Contrôles de Navigation
- **📍 Ma position** : Géolocalisation de l'utilisateur
- **🏠 Vue d'ensemble** : Retour à la vue continentale
- **🎤 Enregistrer** : Création de notes vocales directement depuis la carte

## 🔍 Système de Recherche et Filtrage

### Barre de Recherche
- Recherche en temps réel dans tous les contenus
- Recherche par nom, ville, pays, genre, langue
- Support multilingue (français, lingala, wolof)

### Filtres Avancés
- **Pays** : RDC, Sénégal, Cameroun
- **Genres** : Musique, Information, Religieux, Général
- **Types de contenu** : Stations, Podcasts, Notes vocales

## 📻 Stations Radio

### Sources de Données
- **radio.garden** : API officielle pour les flux audio
- **Coordonnées géographiques** : Basées sur les villes réelles
- **Métadonnées** : Genre, langue, description

### Stations Disponibles
- **RDC (Kinshasa)** : Top Congo FM, Radio Okapi, Radio Digital Congo
- **Sénégal (Dakar)** : Rewmi FM, Radio Dakar City, H24 Senegal, Radio Urum-Bi
- **Cameroun** : Radio Bonne Nouvelle FM, Balla Radio, RVC Radio

## 🎧 Podcasts

### Contenu Thématique
- **Histoire de l'Afrique** : Dr. Moussa (Douala)
- **Musique traditionnelle** : Fatou Diallo (Dakar)
- **Actualités économiques** : Jean-Pierre (Kinshasa)
- **Cuisine africaine** : Aminata (Dakar)
- **Technologie en Afrique** : Tech Team (Yaoundé)

### Localisation
- Coordonnées géographiques précises
- Association ville/pays automatique
- Catégorisation par thème

## 🎤 Notes Vocales

### Fonctionnalités d'Enregistrement
- **Enregistrement direct** depuis la carte
- **Géolocalisation automatique** de l'utilisateur
- **Limite de temps** : 60 secondes maximum
- **Qualité audio** : WAV, haute fidélité

### Gestion des Notes
- **Stockage local** : localStorage sécurisé
- **Métadonnées** : Titre, description, catégorie
- **Organisation** : Par date, lieu, utilisateur
- **Export/Import** : Format JSON standard

### Interface Utilisateur
- **Marqueurs personnalisés** : Icônes distinctives par type
- **Popups informatifs** : Détails complets et contrôles audio
- **Contrôles de lecture** : Lecteur audio intégré
- **Partage** : API Web Share ou téléchargement

## 🎯 Utilisation Avancée

### Création de Notes Vocales
1. Cliquer sur le bouton **🎤 Enregistrer**
2. Autoriser l'accès au microphone
3. Parler pendant maximum 60 secondes
4. La note est automatiquement géolocalisée
5. Ajout automatique à la carte

### Navigation sur la Carte
- **Zoom** : Molette de souris ou boutons +/-
- **Déplacement** : Clic et glisser
- **Sélection** : Clic sur les marqueurs
- **Informations** : Popups détaillés

### Personnalisation
- **Affichage** : Activer/désactiver les couches
- **Filtrage** : Par pays, genre, type
- **Recherche** : Texte libre ou filtres combinés

## 🔧 Configuration Technique

### Dépendances
- **Leaflet** : 1.9.4 (carte interactive)
- **Vue.js** : 3.5.17 (interface utilisateur)
- **Geolocation API** : Navigation standard
- **MediaRecorder API** : Enregistrement audio

### Stockage
- **localStorage** : Notes vocales et préférences
- **IndexedDB** : Cache des données audio
- **SessionStorage** : État temporaire de l'interface

### API Externes
- **OpenStreetMap** : Cartes et géocodage
- **Nominatim** : Géocodage inverse (coordonnées → ville)
- **radio.garden** : Flux audio des stations

## 📱 Responsive Design

### Adaptations Mobile
- **Contrôles tactiles** : Optimisés pour mobile
- **Interface adaptative** : Adaptation automatique à la taille d'écran
- **Géolocalisation** : Précision GPS mobile
- **Enregistrement** : Optimisé pour appareils mobiles

### Performances
- **Chargement progressif** : Données chargées à la demande
- **Cache intelligent** : Mise en cache des ressources
- **Optimisation mémoire** : Gestion efficace des ressources audio

## 🚀 Fonctionnalités Futures

### Développements Prévus
- **Synchronisation cloud** : Sauvegarde et partage
- **Collaboration** : Notes partagées entre utilisateurs
- **Analytics** : Statistiques d'utilisation
- **Intégration sociale** : Partage sur réseaux sociaux

### Améliorations Techniques
- **PWA** : Application web progressive
- **Offline** : Fonctionnement sans connexion
- **Notifications** : Alertes et rappels
- **Accessibilité** : Support des lecteurs d'écran

## 🐛 Dépannage

### Problèmes Courants
- **Microphone non accessible** : Vérifier les permissions du navigateur
- **Géolocalisation échouée** : Vérifier les paramètres de localisation
- **Carte ne se charge pas** : Vérifier la connexion internet
- **Audio ne se joue pas** : Vérifier le support du format audio

### Solutions
- **Permissions** : Autoriser l'accès au microphone et à la localisation
- **Navigateur** : Utiliser un navigateur moderne (Chrome, Firefox, Safari)
- **Connexion** : Vérifier la stabilité de la connexion internet
- **Cache** : Vider le cache du navigateur si nécessaire

## 📞 Support

Pour toute question ou problème :
- **Documentation** : Ce fichier et les commentaires du code
- **Issues** : Système de tickets GitHub
- **Communauté** : Forum utilisateurs Eclairia

---

*Documentation mise à jour le : 2024-01-15*
*Version : 1.0*
*Développé par : Équipe Eclairia* 
