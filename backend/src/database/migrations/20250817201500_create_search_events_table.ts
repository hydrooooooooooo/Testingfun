import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('search_events', (table) => {
    table.increments('id').primary();
    table.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('session_id').nullable().references('id').inTable('scraping_sessions').onDelete('SET NULL');
    table.string('url').notNullable();
    table.string('domain').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('search_events');
}
