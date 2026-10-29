# ─── Stage 1: Development ────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Installer les outils système nécessaires pour Prisma + PostGIS
RUN apk add --no-cache openssl libc6-compat

# Copier les manifests de dépendances
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Installer toutes les dépendances
RUN npm ci --workspace=apps/api --workspace=packages/shared

# Copier les sources
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Générer le client Prisma
WORKDIR /app/apps/api
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci --workspace=apps/api --workspace=packages/shared

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat dumb-init

# Copier uniquement les fichiers nécessaires en production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
