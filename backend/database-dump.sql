-- Optionnel mais conseillé pour éviter d'échouer si relancé
CREATE SCHEMA IF NOT EXISTS public;

-- 1) users
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(255) NOT NULL DEFAULT 'user',
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  verification_token VARCHAR(255),
  verification_token_expires_at TIMESTAMPTZ,
  reset_token VARCHAR(255),
  reset_token_expires_at TIMESTAMPTZ,
  profile_image VARCHAR(255),
  subscription_status VARCHAR(255) NOT NULL DEFAULT 'free',
  phone_number VARCHAR(255)
);

-- Index ajouté par migration 20250808132300_add_phone_number_to_users.ts
CREATE INDEX IF NOT EXISTS users_phone_number_idx ON public.users (phone_number);

-- 2) packs
CREATE TABLE IF NOT EXISTS public.packs (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nb_downloads INTEGER NOT NULL,
  price NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255) NOT NULL,
  price_label VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  popular BOOLEAN DEFAULT FALSE,
  stripe_price_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) scraping_sessions
CREATE TABLE IF NOT EXISTS public.scraping_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(255) NOT NULL,
  "actorRunId" VARCHAR(255),
  "datasetId" VARCHAR(255),
  "isPaid" BOOLEAN DEFAULT FALSE,
  -- packId (camelCase) ajouté dans la 1ère création, sans FK
  "packId" VARCHAR(255),
  downloadUrl VARCHAR(1024),
  downloadToken VARCHAR(1024),
  totalItems INTEGER,
  previewItems JSON,
  "hasData" BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  payment_intent_id VARCHAR(255),
  url VARCHAR(255),
  -- pack_id (snake_case) ajouté ensuite avec FK vers packs
  pack_id VARCHAR(255) REFERENCES public.packs(id) ON DELETE SET NULL,
  payment_method VARCHAR(255)
);

-- 4) payments (création + altération/rename)
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  -- stripe_payment_id renommé en stripePaymentIntentId (migration 20250714221500)
  "stripePaymentIntentId" VARCHAR(255) NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- champs ajoutés par 20250714221500_update_payments_table.ts
  "creditsPurchased" INTEGER,
  "packId" VARCHAR(255),
  "stripeCheckoutId" VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5) scraping_jobs
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  apify_run_id VARCHAR(255),
  status VARCHAR(255),
  input_parameters JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 6) downloads (+ altérations)
CREATE TABLE IF NOT EXISTS public.downloads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  scraping_job_id INTEGER REFERENCES public.scraping_jobs(id) ON DELETE CASCADE,
  format VARCHAR(20) NOT NULL,
  file_path VARCHAR(500),
  downloaded_at TIMESTAMPTZ DEFAULT now(),
  ip_address VARCHAR(255),
  scraped_url VARCHAR(255),
  -- colonnes ajoutées plus tard par 20250808134500
  session_id VARCHAR(255),
  download_token VARCHAR(255),
  expires_at TIMESTAMPTZ
);

-- 7) user_purchases
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL UNIQUE REFERENCES public.scraping_sessions(id) ON DELETE CASCADE,
  pack_id VARCHAR(255) NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  amount_paid NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  download_url VARCHAR(512) NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now()
);

-- 8) mvola_payments + enum PostgreSQL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_mvola_payments_status') THEN
    CREATE TYPE enum_mvola_payments_status AS ENUM ('pending','completed','failed','cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.mvola_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id VARCHAR(255) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'Ar',
  customer_msisdn VARCHAR(255) NOT NULL,
  client_transaction_id VARCHAR(255) NOT NULL UNIQUE,
  server_correlation_id VARCHAR(255) NOT NULL UNIQUE,
  status enum_mvola_payments_status NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  status_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);