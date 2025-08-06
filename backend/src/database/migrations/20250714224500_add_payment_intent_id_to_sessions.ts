import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('scraping_sessions', (table) => {
    table.string('payment_intent_id').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('scraping_sessions', (table) => {
    table.dropColumn('payment_intent_id');
  });
}
