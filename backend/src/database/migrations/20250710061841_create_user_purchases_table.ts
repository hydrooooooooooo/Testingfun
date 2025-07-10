import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_purchases', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_id').notNullable().unique().references('id').inTable('scraping_sessions').onDelete('CASCADE');
    table.string('pack_id').notNullable();
    table.string('payment_intent_id').notNullable().unique();
    table.decimal('amount_paid', 10, 2).notNullable();
    table.string('currency', 3).notNullable();
    table.string('download_url', 512).notNullable();
    table.timestamp('purchased_at').defaultTo(knex.fn.now());
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('user_purchases');
}

