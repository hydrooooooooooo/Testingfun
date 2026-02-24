import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSector = await knex.schema.hasColumn('users', 'business_sector');
  const hasSize = await knex.schema.hasColumn('users', 'company_size');

  if (!hasSector || !hasSize) {
    await knex.schema.alterTable('users', (table) => {
      if (!hasSector) {
        table.string('business_sector', 50).nullable();
      }
      if (!hasSize) {
        table.string('company_size', 20).nullable();
      }
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSector = await knex.schema.hasColumn('users', 'business_sector');
  const hasSize = await knex.schema.hasColumn('users', 'company_size');

  if (hasSector || hasSize) {
    await knex.schema.alterTable('users', (table) => {
      if (hasSector) table.dropColumn('business_sector');
      if (hasSize) table.dropColumn('company_size');
    });
  }
}
