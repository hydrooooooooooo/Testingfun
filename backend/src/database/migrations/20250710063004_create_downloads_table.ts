import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('downloads', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('scraping_job_id').unsigned().references('id').inTable('scraping_jobs').onDelete('CASCADE');
    table.string('format', 20).notNullable();
    table.string('file_path', 500);
    table.timestamp('downloaded_at').defaultTo(knex.fn.now());
    table.string('ip_address'); // INET is specific to PostgreSQL, using string for broader compatibility
    table.string('scraped_url'); // Ajout du champ scraped_url
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('downloads');
}
