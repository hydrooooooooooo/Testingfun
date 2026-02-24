import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Table 1: facebook_page_tracking
  await knex.schema.createTable('facebook_page_tracking', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('page_url').notNullable();
    table.text('page_name');
    table.timestamp('last_scraped_at');
    table.text('last_post_id');
    table.timestamp('last_post_date');
    table.integer('total_posts_scraped').defaultTo(0);
    table.integer('total_sessions').defaultTo(0);
    table.timestamps(true, true);

    table.unique(['user_id', 'page_url']);
    table.index('user_id');
    table.index('page_url');
    table.index('last_scraped_at');
  });

  // Table 2: facebook_scraped_posts
  await knex.schema.createTable('facebook_scraped_posts', (table) => {
    table.increments('id').primary();
    table.integer('tracking_id').unsigned().notNullable().references('id').inTable('facebook_page_tracking').onDelete('CASCADE');
    table.text('post_id').notNullable();
    table.timestamp('post_date');
    table.timestamp('scraped_at').defaultTo(knex.fn.now());
    table.string('session_id');

    table.unique(['tracking_id', 'post_id']);
    table.index('tracking_id');
    table.index('post_id');
    table.index('post_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('facebook_scraped_posts');
  await knex.schema.dropTableIfExists('facebook_page_tracking');
}
