import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('scraping_jobs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('apify_run_id');
    table.string('status');
    table.jsonb('input_parameters');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('finished_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('scraping_jobs');
}
