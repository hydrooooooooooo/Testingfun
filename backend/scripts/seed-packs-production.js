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
      stripe_price_id: process.env.STRIPE_PRICE_STARTER || '',
      stripe_price_id_mga: process.env.STRIPE_PRICE_STARTER_MGA || ''
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
      stripe_price_id: process.env.STRIPE_PRICE_PRO || '',
      stripe_price_id_mga: process.env.STRIPE_PRICE_PRO_MGA || ''
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
      stripe_price_id: process.env.STRIPE_PRICE_BUSINESS || '',
      stripe_price_id_mga: process.env.STRIPE_PRICE_BUSINESS_MGA || ''
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
