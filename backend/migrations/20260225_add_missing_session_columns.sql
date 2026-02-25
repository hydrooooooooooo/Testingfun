-- Migration: Add missing columns to scraping_sessions
-- These were added by Knex migration 20251120000000_add_facebook_pages_support.ts
-- but never converted to SQL for production

-- scrape_type (from 20251120000000_add_facebook_pages_support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'scrape_type') THEN
    ALTER TABLE scraping_sessions ADD COLUMN scrape_type VARCHAR(50) DEFAULT 'marketplace';
  END IF;
END $$;

-- url (used by session creation in automation + scrape controllers)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'url') THEN
    ALTER TABLE scraping_sessions ADD COLUMN url TEXT;
  END IF;
END $$;

-- page_urls (from 20251120000000_add_facebook_pages_support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'page_urls') THEN
    ALTER TABLE scraping_sessions ADD COLUMN page_urls JSONB;
  END IF;
END $$;

-- extraction_config (from 20251120000000_add_facebook_pages_support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'extraction_config') THEN
    ALTER TABLE scraping_sessions ADD COLUMN extraction_config JSONB;
  END IF;
END $$;

-- sub_sessions (from 20251120000000_add_facebook_pages_support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'sub_sessions') THEN
    ALTER TABLE scraping_sessions ADD COLUMN sub_sessions JSONB;
  END IF;
END $$;

-- data_types (from 20251120000000_add_facebook_pages_support)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'data_types') THEN
    ALTER TABLE scraping_sessions ADD COLUMN data_types JSONB;
  END IF;
END $$;

-- items_scraped (used by sessionService)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'items_scraped') THEN
    ALTER TABLE scraping_sessions ADD COLUMN items_scraped INTEGER DEFAULT 0;
  END IF;
END $$;

-- page_name (used by mentions + session display)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'page_name') THEN
    ALTER TABLE scraping_sessions ADD COLUMN page_name VARCHAR(255);
  END IF;
END $$;

-- apify_run_id (used by automation execution)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'apify_run_id') THEN
    ALTER TABLE scraping_sessions ADD COLUMN apify_run_id VARCHAR(100);
  END IF;
END $$;

-- dataset_id (used by backup + data retrieval)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'dataset_id') THEN
    ALTER TABLE scraping_sessions ADD COLUMN dataset_id VARCHAR(100);
  END IF;
END $$;

-- total_posts (used by Facebook Pages pipeline)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'total_posts') THEN
    ALTER TABLE scraping_sessions ADD COLUMN total_posts INTEGER DEFAULT 0;
  END IF;
END $$;

SELECT 'scraping_sessions columns migration completed' as status;
