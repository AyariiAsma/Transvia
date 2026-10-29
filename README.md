# 🚗 LogisticApp — Plateforme de Transport & Livraison

> Solution clé en main de mobilité à la demande (type Uber/Bolt/Yassir) — Production-ready

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com)
[![React Native](https://img.shields.io/badge/React_Native-0.76-blue)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-52-000)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_PostGIS-blue)](https://postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Table des Matières

- [Aperçu](#aperçu)
- [Architecture](#architecture)
- [Stack Technique](#stack-technique)
- [Démarrage Rapide](#démarrage-rapide)
- [Structure du Projet](#structure-du-projet)
- [API Reference](#api-reference)
- [Variables d'Environnement](#variables-denvironnement)
- [Tests](#tests)
- [Déploiement](#déploiement)

---

## 🌟 Aperçu

LogisticApp est une plateforme complète de transport à la demande ciblant 3 pays :

| Pays | Devise | Code pays |
|------|--------|-----------|
| 🇹🇳 Tunisie | TND | +216 |
| 🇩🇿 Algérie | DZD | +213 |
| 🇲🇦 Maroc | MAD | +212 |

### Fonctionnalités principales

**👤 Client**
- Recherche d'adresses (Google Places autocomplete)
- Estimation du prix avec détail (base + km + temps + surge + promo)
- Réservation de course VTC ou livraison
- Suivi temps réel du chauffeur sur carte (WebSocket)
- Paiement : espèces / carte / wallet
- Codes promo, notation, historique, reçu
- Planification de course

**🚗 Chauffeur**
- Inscription avec upload de documents (Cloudinary)
- Validation des documents par les admins
- Toggle En ligne / Hors ligne
- Position GPS en arrière-plan (Expo TaskManager)
- Réception des demandes de course avec timer
- Gestion du cycle de vie de la course
- Tableau de bord gains (jour/semaine/mois)
- Demandes de retrait

**🛡️ Admin (Web + Mobile léger)**
- Dashboard temps réel (courses actives, chauffeurs en ligne)
- Carte live des chauffeurs
- Gestion chauffeurs (approbation, suspension, documents)
- Gestion clients et courses
- Tarification par pays/zone/type de véhicule avec surge
- Codes promo avancés
- Paiements et retraits
- Notifications broadcast

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  📱 App Mobile (Expo)     🌐 Admin Web (Next.js)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────────┐
│                    NestJS API (v1)                               │
│  REST Endpoints + WebSocket Gateways (Socket.IO)                │
│  Auth (JWT + Firebase) | Rides | Dispatch | Pricing | Admin     │
└──────┬──────────┬─────────────┬──────────────┬──────────────────┘
       │          │             │              │
  ┌────▼────┐ ┌──▼──┐  ┌───────▼──────┐ ┌───▼────────┐
  │PostgreSQL│ │Redis│  │  OSRM        │ │ Cloudinary │
  │+PostGIS │ │GEO  │  │  (Routing)   │ │ (Documents)│
  └─────────┘ └─────┘  └──────────────┘ └────────────┘
                         ┌──────────────┐
                         │  Firebase    │
                         │  (OTP/Push)  │
                         └──────────────┘
```

### Algorithme de Dispatch

```
Course créée
    │
    ▼
Rayon initial: 2km
    │
    ▼
Redis GEORADIUS → Chauffeurs proches
    │
    ├──[Aucun]──→ Augmenter rayon +1km → Réessayer (max 10km)
    │                                         │
    │                                    [Max atteint] → NO_DRIVER
    │
    ▼
Offrir au chauffeur #1 (Socket.IO + FCM)
    │
    ├──[Accepté dans 30s]──→ Course ACCEPTED ✅
    │
    └──[Timeout/Refus]──→ Chauffeur suivant (BullMQ delayed job)
```

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| **API** | NestJS 10 + TypeScript 5 |
| **ORM** | Prisma 5 + PostgreSQL 16 + PostGIS |
| **Cache/Geo** | Redis (ioredis) + GEORADIUS |
| **Temps réel** | Socket.IO (namespaces /client, /driver, /admin) |
| **Jobs** | BullMQ (dispatch, notifications) |
| **Auth** | JWT (access 15min + refresh 30j rotation) + Firebase OTP |
| **Sécurité** | Argon2id, Helmet, CORS, ThrottlerModule, RBAC |
| **Mobile** | React Native 0.76 + Expo 52 + expo-router |
| **Cartes** | react-native-maps (Google Maps) |
| **Routage** | OSRM (fallback Haversine) |
| **State** | Zustand + React Query |
| **i18n** | react-i18next (FR/AR RTL/EN) |
| **Admin Web** | Next.js 14 + Recharts + Leaflet |
| **Storage** | Cloudinary |
| **CI/CD** | GitHub Actions + Docker + EAS Build |

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js ≥ 20
- Docker & Docker Compose
- Expo CLI (`npm i -g expo-cli`)

### 1. Clone & Installation

```bash
git clone https://github.com/votre-org/logisticapp.git
cd logisticapp
npm install        # installe tous les workspaces
```

### 2. Configuration

```bash
cp .env.example apps/api/.env
# Éditer apps/api/.env avec vos valeurs
```

Variables **minimales** pour développement :
```env
DATABASE_URL=postgresql://logistic:secret@localhost:5432/logistic_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=changeme-access-32chars-minimum
JWT_REFRESH_SECRET=changeme-refresh-32chars-minimum
GOOGLE_MAPS_API_KEY=AIza...
FIREBASE_PROJECT_ID=your-firebase-project
```

### 3. Lancer l'infrastructure (Docker)

```bash
docker-compose up -d postgres redis osrm
# Attendre ~30s que les services démarrent
```

### 4. Migration & Seed

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

Les comptes de démo sont créés :
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@demo.com | Demo@1234 | Admin |
| client@demo.com | Demo@1234 | Client |
| chauffeur@demo.com | Demo@1234 | Chauffeur |

### 5. Lancer les services

```bash
# Terminal 1 — API NestJS
cd apps/api && npm run start:dev

# Terminal 2 — Admin Web
cd apps/admin-web && npm run dev

# Terminal 3 — App Mobile
cd apps/mobile && expo start
```

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/api/docs |
| Admin Web | http://localhost:3001 |
| Expo DevTools | exp://localhost:19000 |

---

## 📁 Structure du Projet

```
logisticapp/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 20+ modèles avec PostGIS
│   │   │   ├── seed.ts         # Données de démo
│   │   │   └── init.sql        # Extensions PostgreSQL
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT + Firebase OTP + RBAC
│   │       │   ├── rides/      # Course + Dispatch + Pricing
│   │       │   ├── drivers/    # Chauffeurs + Documents
│   │       │   ├── users/      # Profil + Wallet
│   │       │   ├── payments/   # Paiements + Retraits
│   │       │   ├── notifications/ # FCM + In-app
│   │       │   ├── geo/        # OSRM + Google Places
│   │       │   ├── admin/      # Dashboard + KPI
│   │       │   ├── websocket/  # 3 gateways Socket.IO
│   │       │   ├── prisma/     # Service DB + PostGIS queries
│   │       │   └── redis/      # GEO + Cache + Pub/Sub
│   │       └── common/
│   │           ├── filters/    # Exception filter global
│   │           └── interceptors/ # Transform + Logging
│   ├── admin-web/              # Panel Admin Next.js 14
│   │   └── app/
│   │       ├── (dashboard)/
│   │       │   ├── overview/   # Dashboard KPI
│   │       │   ├── rides/      # Gestion courses
│   │       │   ├── drivers/    # Gestion chauffeurs
│   │       │   ├── clients/    # Gestion clients
│   │       │   ├── payments/   # Finance
│   │       │   ├── pricing/    # Tarification
│   │       │   ├── promo/      # Codes promo
│   │       │   └── map/        # Carte live
│   │       └── (auth)/         # Login admin
│   └── mobile/                 # App React Native + Expo
│       ├── app/
│       │   ├── (auth)/         # Welcome + Login + Register
│       │   ├── (client)/       # Écrans client
│       │   ├── (driver)/       # Écrans chauffeur
│       │   └── (admin)/        # Admin mobile léger
│       └── src/
│           ├── components/     # Composants réutilisables
│           ├── stores/         # Zustand (auth, ride, driver)
│           ├── services/       # API, Socket, Location, Notifications
│           ├── hooks/          # React Query hooks
│           ├── i18n/           # Traductions FR/AR/EN
│           └── theme/          # Couleurs, typo, spacing
└── packages/
    └── shared/                 # Types, Schémas Zod, Constantes
        └── src/
            ├── types/          # TypeScript interfaces partagées
            ├── schemas/        # Validation Zod
            └── constants/      # State machine, dispatch config, events
```

---

## 📡 API Reference

Base URL : `http://localhost:3000/api/v1`
Documentation complète : `http://localhost:3000/api/docs` (Swagger UI)

### Auth

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion email/password |
| POST | `/auth/otp/send` | Envoi OTP SMS (Firebase) |
| POST | `/auth/otp/verify` | Vérification OTP → tokens |
| POST | `/auth/refresh` | Renouveler l'access token |
| POST | `/auth/logout` | Déconnexion (révoque refresh) |
| GET  | `/auth/me` | Profil courant |

### Rides (Client)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/rides/estimate` | Estimation tarif + route |
| POST | `/rides` | Créer une course |
| GET  | `/rides/history` | Historique |
| GET  | `/rides/:id` | Détail |
| POST | `/rides/:id/cancel` | Annuler |
| POST | `/rides/:id/rate` | Noter le chauffeur |
| GET  | `/rides/:id/track` | Position live du chauffeur |

### Driver

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/driver/register` | Inscription chauffeur |
| POST | `/driver/documents` | Upload document |
| PATCH | `/driver/status` | Toggle en ligne |
| POST | `/driver/rides/:id/accept` | Accepter une course |
| POST | `/driver/rides/:id/arrived` | Signaler arrivée |
| POST | `/driver/rides/:id/start` | Démarrer la course |
| POST | `/driver/rides/:id/complete` | Terminer la course |
| GET  | `/driver/earnings` | Gains |

### WebSocket Events

```javascript
// Namespace /client
socket.on('ride:accepted', ({ ride, driver, eta }) => {})
socket.on('ride:driver_location', ({ lat, lng, heading, eta }) => {})
socket.on('ride:cancelled', ({ rideId, reason }) => {})
socket.on('ride:completed', ({ rideId, finalFare }) => {})

// Namespace /driver
socket.on('ride:new_request', ({ ride, pickupDistanceKm, timeoutSeconds }) => {})
socket.emit('driver:location_update', { lat, lng, heading, speed })

// Namespace /admin
socket.on('dashboard:driver_location', ({ driverId, lat, lng }) => {})
socket.on('dashboard:ride_update', ({ rideId, status }) => {})
```

---

## ⚙️ Variables d'Environnement

Voir `.env.example` pour la liste complète. Variables clés :

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT (minimum 32 chars)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_URL=redis://localhost:6379

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Google Maps (Directions + Places)
GOOGLE_MAPS_API_KEY=

# OSRM
OSRM_BASE_URL=http://router.project-osrm.org

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Mobile (Expo)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_MAPS_KEY=
```

---

## 🧪 Tests

```bash
# Unit tests
cd apps/api
npm run test

# Tests avec couverture
npm run test:cov

# Tests d'intégration (nécessite DB de test)
DATABASE_URL=postgresql://test:test@localhost:5432/logistic_test \
  npm run test:e2e

# Watch mode
npm run test:watch
```

Couverture actuelle :
- `AuthService` : register, login, logout, refresh, password reset
- `PricingService` : calcul tarif, surge, promo, commission

---

## 🚢 Déploiement

### Docker Compose (Production)

```bash
# Build et lancer tous les services
docker-compose -f docker-compose.yml up -d

# Migrations en production
docker-compose exec api npx prisma migrate deploy
```

### EAS Build (Mobile)

```bash
# Configurer EAS
eas login && eas build:configure

# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production

# Submit (stores)
eas submit --platform android
eas submit --platform ios
```

### Variables d'environnement production

- Utiliser des secrets GitH Actions / Vault pour les credentials sensibles
- Rotation automatique des clés JWT recommandée
- Activer SSL/TLS pour PostgreSQL et Redis en production
- Configurer les CORS pour les domaines production uniquement

---

## 🔐 Sécurité

- **Authentification** : JWT HS256 + Argon2id (passwords) + Rotation des refresh tokens
- **OTP** : Firebase Phone Auth (anti-brute-force intégré)
- **Rate limiting** : 100 req/min global, 3 req/min OTP
- **Headers** : Helmet (CSP, HSTS, X-Frame-Options, etc.)
- **Validation** : class-validator strict (whitelist + transform)
- **RBAC** : Guards `JwtAuthGuard` + `RolesGuard` par endpoint
- **Passwords** : Argon2id avec memoryCost 64MB, timeCost 3
- **SQL injection** : Prisma ORM (requêtes paramétrées)
- **PostGIS** : Pas d'exposition directe des requêtes spatiales
- **Tokens invalidés** : Redis TTL + DB révocation
- **OWASP Top 10** : Couverts (A01 Auth, A02 Crypto, A03 Injection, A07 Auth failures)

---

## 🌍 Internationalisation

L'app mobile supporte 3 langues avec RTL pour l'arabe :

```typescript
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();

// Changer la langue
await i18n.changeLanguage('ar'); // RTL automatique
await i18n.changeLanguage('fr');
await i18n.changeLanguage('en');
```

---

## 📞 Support

Pour toute question ou problème, ouvrir une issue sur GitHub.

---

*Made with ❤️ — LogisticApp v1.0.0*
