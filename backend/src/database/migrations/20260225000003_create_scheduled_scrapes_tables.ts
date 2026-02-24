import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. scheduled_scrapes — main automation config
  if (!(await knex.schema.hasTable('scheduled_scrapes'))) {
    await knex.schema.createTable('scheduled_scrapes', (t) => {
      t.string('id', 30).primary();              // sched_<nanoid>
      t.integer('user_id').unsigned().notNullable();
      t.string('name', 200).notNullable();
      t.text('description').nullable();
      t.string('scrape_type', 30).notNullable();  // marketplace | facebook_pages | posts_comments
      t.text('target_url').notNullable();
      t.string('frequency', 20).notNullable().defaultTo('weekly'); // daily | weekly | monthly | custom
      t.string('custom_cron_expression', 50).nullable();
      t.timestamp('next_run_at').nullable();
      t.timestamp('last_run_at').nullable();
      t.boolean('is_active').notNullable().defaultTo(true);
      t.boolean('is_paused').notNullable().defaultTo(false);
      t.string('pause_reason', 200).nullable();
      t.text('config').notNullable().defaultTo('{}');                    // JSON
      t.text('notification_settings').notNullable().defaultTo('{}');     // JSON
      t.integer('credits_per_run').notNullable().defaultTo(1);
      t.integer('total_credits_spent').notNullable().defaultTo(0);
      t.integer('total_runs').notNullable().defaultTo(0);
      t.integer('successful_runs').notNullable().defaultTo(0);
      t.integer('failed_runs').notNullable().defaultTo(0);
      t.timestamps(true, true);

      t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.index(['user_id', 'is_active']);
      t.index('next_run_at');
    });
  }

  // 2. scheduled_scrape_executions — execution history
  if (!(await knex.schema.hasTable('scheduled_scrape_executions'))) {
    await knex.schema.createTable('scheduled_scrape_executions', (t) => {
      t.string('id', 30).primary();
      t.string('scheduled_scrape_id', 30).notNullable();
      t.string('session_id', 30).nullable();       // link to scraping_sessions
      t.string('status', 20).notNullable().defaultTo('running'); // running | completed | failed
      t.integer('items_scraped').notNullable().defaultTo(0);
      t.integer('credits_used').notNullable().defaultTo(0);
      t.integer('duration_seconds').nullable();
      t.text('error_message').nullable();
      t.text('changes_detected').nullable();        // JSON
      t.timestamp('completed_at').nullable();
      t.timestamps(true, true);

      t.foreign('scheduled_scrape_id').references('id').inTable('scheduled_scrapes').onDelete('CASCADE');
      t.index(['scheduled_scrape_id', 'created_at']);
    });
  }

  // 3. scheduled_scrape_changes — detected changes between runs
  if (!(await knex.schema.hasTable('scheduled_scrape_changes'))) {
    await knex.schema.createTable('scheduled_scrape_changes', (t) => {
      t.increments('id').primary();
      t.string('execution_id', 30).notNullable();
      t.string('change_type', 50).notNullable();     // new_item | removed_item | price_change | mention_detected
      t.string('change_category', 50).nullable();
      t.text('old_value').nullable();
      t.text('new_value').nullable();
      t.string('severity', 20).nullable();            // low | medium | high
      t.text('metadata').nullable();                   // JSON
      t.timestamps(true, true);

      t.foreign('execution_id').references('id').inTable('scheduled_scrape_executions').onDelete('CASCADE');
      t.index('execution_id');
    });
  }

  // 4. scheduled_scrape_notifications — alert history
  if (!(await knex.schema.hasTable('scheduled_scrape_notifications'))) {
    await knex.schema.createTable('scheduled_scrape_notifications', (t) => {
      t.increments('id').primary();
      t.string('scheduled_scrape_id', 30).notNullable();
      t.string('execution_id', 30).nullable();
      t.string('type', 30).notNullable();            // success | error | price_change | mention | weekly_report
      t.string('channel', 20).notNullable().defaultTo('email'); // email
      t.string('recipient', 200).nullable();
      t.text('subject').nullable();
      t.text('content').nullable();
      t.boolean('sent').notNullable().defaultTo(false);
      t.text('error').nullable();
      t.timestamps(true, true);

      t.foreign('scheduled_scrape_id').references('id').inTable('scheduled_scrapes').onDelete('CASCADE');
      t.index(['scheduled_scrape_id', 'created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('scheduled_scrape_notifications');
  await knex.schema.dropTableIfExists('scheduled_scrape_changes');
  await knex.schema.dropTableIfExists('scheduled_scrape_executions');
  await knex.schema.dropTableIfExists('scheduled_scrapes');
}
