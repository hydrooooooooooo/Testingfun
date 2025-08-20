CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    email_verified_at TIMESTAMP,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMP,
    profile_image VARCHAR(255),
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'free',
    phone_number VARCHAR(255)1
);

CREATE TABLE scraping_sessions (
    "id" VARCHAR(255) PRIMARY KEY,
    "user_id" INTEGER REFERENCES users(id) ON DELETE CASCADE,
    "status" VARCHAR(50) NOT NULL,
    "actorRunId" VARCHAR(255),
    "datasetId" VARCHAR(255),
    "isPaid" BOOLEAN DEFAULT false,
    "packId" VARCHAR(255),
    "downloadUrl" VARCHAR(1024),
    "downloadToken" VARCHAR(1024),
    "totalItems" INTEGER,
    "previewItems" JSON,
    "hasData" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "url" VARCHAR(255),
    "payment_method" VARCHAR(50),
    "payment_intent_id" VARCHAR(255)
);


CREATE TABLE scraping_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    apify_run_id VARCHAR(255),
    status VARCHAR(50),
    input_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE
);


CREATE TABLE payments (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES users(id) ON DELETE CASCADE,
    "stripePaymentIntentId" VARCHAR(255) NOT NULL UNIQUE,
    "amount" DECIMAL(10, 2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "creditsPurchased" INTEGER,
    "packId" VARCHAR(255),
    "stripeCheckoutId" VARCHAR(255)
);

CREATE TABLE downloads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    scraping_job_id INTEGER REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(255),
    scraped_url VARCHAR(255),
    session_id VARCHAR(255),
    download_token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 day',
);

CREATE TABLE packs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    nb_downloads INTEGER NOT NULL,
    price DECIMAL(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    price_label VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    popular BOOLEAN DEFAULT false,
    stripe_price_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mvola_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pack_id VARCHAR(255) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'Ar',
    customer_msisdn VARCHAR(255) NOT NULL,
    client_transaction_id VARCHAR(255) NOT NULL UNIQUE,
    server_correlation_id VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    status_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE REFERENCES scraping_sessions(id) ON DELETE CASCADE,
    pack_id VARCHAR(255) NOT NULL,
    payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount_paid DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    download_url VARCHAR(512) NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);1


-- Supprimer les packs existants
DELETE FROM packs;

-- Insérer les packs
INSERT INTO packs (id, name, nb_downloads, price, currency, price_label, description, popular, stripe_price_id)
VALUES
    ('pack-decouverte', 'Pack Découverte', 50, 25000.00, 'MGA', '5 € / 25 000 Ar', '50 extractions complètes de données pour découvrir la qualité de nos services. Crédits sans expiration.', false, 'price_1RaCEAP6UShCV9FsS1FImeAP'),
    ('pack-essentiel', 'Pack Essentiel', 150, 60000.00, 'MGA', '12 € / 60 000 Ar', '150 extractions de données complètes. Économisez 47% par rapport aux téléchargements individuels. Notre offre la plus populaire.', true, 'price_1RaCEAP6UShCV9FsS1FImeAP'),
    ('pack-business', 'Pack Business', 350, 125000.00, 'MGA', '25 € / 125 000 Ar', '350 extractions complètes avec économies substantielles. Idéal pour vos projets d''analyse de données récurrents.', false, 'price_1RaCEAP6UShCV9FsS1FImeAP'),
    ('pack-pro', 'Pack Pro', 700, 225000.00, 'MGA', '45 € / 225 000 Ar', '700 extractions de données complètes. Idéal pour les besoins professionnels et les projets à grande échelle.', false, 'price_1RaCEAP6UShCV9FsS1FImeAP'),
    ('pack-premium', 'Pack Premium', 1200, 375000.00, 'MGA', '75 € / 375 000 Ar', '1200 extractions de données complètes. Pour les entreprises avec des besoins importants en données.', false, 'price_1RaCEAP6UShCV9FsS1FImeAP');

-- Mettre à jour les timestamps
UPDATE packs SET 
    created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;