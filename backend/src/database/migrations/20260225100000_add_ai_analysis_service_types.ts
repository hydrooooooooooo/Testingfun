import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_service_type_check;
  `);

  await knex.raw(`
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_service_type_check
    CHECK (service_type IN (
      'facebook_posts',
      'facebook_pages',
      'marketplace',
      'facebook_pages_benchmark',
      'facebook_pages_calendar',
      'facebook_pages_copywriting',
      'ai_analysis',
      'mention_analysis'
    ));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE credit_transactions
    DROP CONSTRAINT IF EXISTS credit_transactions_service_type_check;
  `);

  await knex.raw(`
    ALTER TABLE credit_transactions
    ADD CONSTRAINT credit_transactions_service_type_check
    CHECK (service_type IN (
      'facebook_posts',
      'facebook_pages',
      'marketplace',
      'facebook_pages_benchmark',
      'facebook_pages_calendar',
      'facebook_pages_copywriting'
    ));
  `);
}
