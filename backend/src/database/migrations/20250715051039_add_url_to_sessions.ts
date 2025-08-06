import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('scraping_sessions', function (table) {
    table.string('url');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('scraping_sessions', function (table) {
    table.dropColumn('url');
  });
}

