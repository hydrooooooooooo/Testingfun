import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // users.trial_used
  const hasUsersTrial = await knex.schema.hasColumn('users', 'trial_used');
  if (!hasUsersTrial) {
    await knex.schema.alterTable('users', (t) => {
      t.boolean('trial_used').notNullable().defaultTo(false);
    });
  }

  // scraping_sessions.is_trial
  const hasIsTrial = await knex.schema.hasColumn('scraping_sessions', 'is_trial');
  if (!hasIsTrial) {
    await knex.schema.alterTable('scraping_sessions', (t) => {
      t.boolean('is_trial').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasUsersTrial = await knex.schema.hasColumn('users', 'trial_used');
  if (hasUsersTrial) {
    await knex.schema.alterTable('users', (t) => {
      t.dropColumn('trial_used');
    });
  }

  const hasIsTrial = await knex.schema.hasColumn('scraping_sessions', 'is_trial');
  if (hasIsTrial) {
    await knex.schema.alterTable('scraping_sessions', (t) => {
      t.dropColumn('is_trial');
    });
  }
}
