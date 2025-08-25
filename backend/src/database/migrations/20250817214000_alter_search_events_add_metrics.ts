import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('search_events');
  if (!hasTable) return;
  const hasStatus = await knex.schema.hasColumn('search_events', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('search_events', (t) => {
      t.enum('status', ['PENDING', 'RUNNING', 'FINISHED', 'FAILED']).nullable().index();
      t.integer('duration_ms').nullable();
      t.string('error_code').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('search_events');
  if (!hasTable) return;
  await knex.schema.alterTable('search_events', (t) => {
    t.dropColumn('status');
    t.dropColumn('duration_ms');
    t.dropColumn('error_code');
  });
}
