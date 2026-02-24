#!/usr/bin/env node
/**
 * Production seed script for packs table.
 * Run on O2Switch: node scripts/seed-packs-production.js
 */

const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://wogo4385_easyscrapy:3asYScrapYP0stGress!2025@localhost:5432/wogo4385_easyscrapy_db'
});

async function run() {
  // Step 1: Add missing columns if needed
  const columns = ['price_eur', 'stripe_price_id_mga', 'price_label', 'currency'];
  for (const col of columns) {
    const exists = await knex.schema.hasColumn('packs', col);
    if (!exists) {
      await knex.schema.alterTable('packs', function(t) {
        if (col === 'price_eur') t.decimal(col, 14, 2).nullable();
        else if (col === 'currency') t.string(col).defaultTo('eur');
        else t.string(col).nullable();
      });
      console.log('Added column:', col);
    }
  }

  // Step 2: Delete old packs and insert new ones
  await knex('packs').del();
  console.log('Deleted old packs');

  await knex('packs').insert([
    {
      id: 'pack-starter',
      name: 'Pack Starter',
      nb_downloads: 250,
      price: 115000,
      price_eur: 2500,
      currency: 'eur',
      price_label: '25 \u20AC / 115 000 Ar',
      description: '250 analyses. Ideal pour demarrer.',
      popular: false,
      stripe_price_id: process.env.STRIPE_PRICE_STARTER || 'price_1SxSDl047sd2yJqZTLZyyBUb',
      stripe_price_id_mga: process.env.STRIPE_PRICE_STARTER_MGA || 'price_1T4Oh7047sd2yJqZkhz9my2e'
    },
    {
      id: 'pack-pro',
      name: 'Pack Pro',
      nb_downloads: 750,
      price: 275000,
      price_eur: 6000,
      currency: 'eur',
      price_label: '60 \u20AC / 275 000 Ar',
      description: '750 analyses. Le plus populaire.',
      popular: true,
      stripe_price_id: process.env.STRIPE_PRICE_PRO || 'price_1SxSDi047sd2yJqZwoT0yloQ',
      stripe_price_id_mga: process.env.STRIPE_PRICE_PRO_MGA || 'price_1T4OkC047sd2yJqZDJzfgxGW'
    },
    {
      id: 'pack-business',
      name: 'Pack Business',
      nb_downloads: 2000,
      price: 550000,
      price_eur: 12000,
      currency: 'eur',
      price_label: '120 \u20AC / 550 000 Ar',
      description: '2000 analyses. Pour agences et entreprises.',
      popular: false,
      stripe_price_id: process.env.STRIPE_PRICE_BUSINESS || 'price_1SxSDd047sd2yJqZx6Pt8xO2',
      stripe_price_id_mga: process.env.STRIPE_PRICE_BUSINESS_MGA || 'price_1T4OmA047sd2yJqZlNfKcJH1'
    }
  ]);

  // Step 3: Show result
  const packs = await knex('packs').select('id', 'name', 'price', 'price_eur', 'price_label', 'stripe_price_id');
  console.table(packs);
  console.log('Done - 3 packs seeded');
  process.exit(0);
}

run().catch(function(e) {
  console.error('Error:', e.message);
  process.exit(1);
});
