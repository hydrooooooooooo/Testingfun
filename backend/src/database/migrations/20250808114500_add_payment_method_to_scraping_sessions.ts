import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('scraping_sessions', (table) => {
    table.string('payment_method').nullable(); // 'stripe' | 'mvola'
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('scraping_sessions', (table) => {
    table.dropColumn('payment_method');
  });
}
