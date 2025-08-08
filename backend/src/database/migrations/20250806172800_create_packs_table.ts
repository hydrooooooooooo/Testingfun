import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('packs', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.integer('nb_downloads').notNullable();
    table.decimal('price', 14, 2).notNullable();
    table.string('currency').notNullable();
    table.string('price_label').notNullable();
    table.text('description').notNullable();
    table.boolean('popular').defaultTo(false);
    table.string('stripe_price_id').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('packs');
}
