import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'last_verification_email_sent_at');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('last_verification_email_sent_at').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'last_verification_email_sent_at');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('last_verification_email_sent_at');
    });
  }
}
