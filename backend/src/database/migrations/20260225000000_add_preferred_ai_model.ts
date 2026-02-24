import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'preferred_ai_model');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('preferred_ai_model', 100).defaultTo('google/gemini-2.5-flash');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'preferred_ai_model');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('preferred_ai_model');
    });
  }
}
