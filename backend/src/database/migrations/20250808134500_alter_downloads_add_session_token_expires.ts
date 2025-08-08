import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('downloads', (table) => {
    table.string('session_id');
    table.string('download_token');
    table.timestamp('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('downloads', (table) => {
    table.dropColumn('session_id');
    table.dropColumn('download_token');
    table.dropColumn('expires_at');
  });
}
