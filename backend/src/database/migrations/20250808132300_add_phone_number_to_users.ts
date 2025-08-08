import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('users');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('users', 'phone_number');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('phone_number').nullable().index();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('users');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('users', 'phone_number');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('phone_number');
    });
  }
}
