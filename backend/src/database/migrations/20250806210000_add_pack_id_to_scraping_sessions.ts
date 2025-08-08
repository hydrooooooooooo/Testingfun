import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('scraping_sessions', (table) => {
    table.string('pack_id').nullable().references('id').inTable('packs').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('scraping_sessions', (table) => {
    table.dropColumn('pack_id');
  });
}
