-- Script d'initialisation PostgreSQL pour LogisticApp
-- Exécuté automatiquement par Docker au premier démarrage

-- Activer les extensions requises
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour la recherche full-text

-- Index géospatial sur les chauffeurs (en complément de PostGIS)
-- Note: Les index principaux sont créés par Prisma migrate
-- Cet index utilise ST_MakePoint pour les recherches géographiques
-- Il sera ajouté APRÈS les migrations Prisma :
-- CREATE INDEX CONCURRENTLY idx_drivers_location_gist
-- ON drivers USING GIST (ST_SetSRID(ST_MakePoint(current_lng, current_lat), 4326))
-- WHERE is_online = true AND status = 'APPROVED';
