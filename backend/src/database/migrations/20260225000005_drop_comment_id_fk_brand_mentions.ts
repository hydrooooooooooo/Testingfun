import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('brand_mentions', 'comment_id');
  if (hasColumn) {
    await knex.schema.alterTable('brand_mentions', (table) => {
      try { table.dropForeign(['comment_id']); } catch {}
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // No-op: don't recreate broken FK
}
