-- Migration: Admin missing schema (users columns + ai_usage_logs table)
-- Date: 2026-02-25
-- Purpose: Add columns and tables needed by admin interface that were added
-- in Knex migrations but never run on O2Switch production PostgreSQL.

BEGIN;

-- 1. Users table: admin management columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_sector VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ai_model VARCHAR(100) DEFAULT 'google/gemini-2.5-flash';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

-- 2. Scraping sessions: AI analysis columns
ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS ai_analysis_facebook_pages_by_page TEXT;
ALTER TABLE scraping_sessions ADD COLUMN IF NOT EXISTS ai_benchmark_facebook_pages_by_page TEXT;

-- 3. AI usage logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  generation_id VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  agent_type VARCHAR(50) DEFAULT 'other',
  tokens_prompt INTEGER DEFAULT 0,
  tokens_completion INTEGER DEFAULT 0,
  tokens_total INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  cost_eur DECIMAL(10,6) DEFAULT 0,
  credits_charged DECIMAL(10,2) DEFAULT 0,
  page_name VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_session_id ON ai_usage_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_agent_type ON ai_usage_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model);

COMMIT;
