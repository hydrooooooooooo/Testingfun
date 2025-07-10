import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('scraping_sessions', (table) => {
    table.string('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('status').notNullable();
    table.string('actorRunId');
    table.string('datasetId');
    table.boolean('isPaid').defaultTo(false);
    table.string('packId');
    table.string('downloadUrl', 1024);
    table.string('downloadToken', 1024);
    table.integer('totalItems');
    table.json('previewItems');
    table.boolean('hasData').defaultTo(false);
    table.timestamps(true, true);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('scraping_sessions');
}

