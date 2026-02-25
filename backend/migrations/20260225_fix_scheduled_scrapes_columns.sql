-- ============================================================
-- Migration: Fix colonnes manquantes dans scheduled_scrape_executions
-- + colonnes notification_settings mal nommées
-- Date: 2026-02-25
-- À exécuter sur O2Switch avec:
--   PGPASSWORD='3asYScrapYP0stGress!2025' psql -h localhost -U wogo4385_easyscrapy -d wogo4385_easyscrapy_db -f 20260225_fix_scheduled_scrapes_columns.sql
-- ============================================================

BEGIN;

-- 1. Colonnes manquantes dans scheduled_scrape_executions
ALTER TABLE scheduled_scrape_executions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS error_stack TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis_performed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS benchmark_performed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mention_detection_performed BOOLEAN DEFAULT FALSE;

COMMIT;

-- Vérification
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'scheduled_scrape_executions'
ORDER BY ordinal_position;
