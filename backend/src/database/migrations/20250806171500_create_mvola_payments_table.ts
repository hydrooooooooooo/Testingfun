import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mvola_payments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('pack_id').notNullable();
    table.decimal('amount', 14, 2).notNullable();
    table.string('currency', 10).notNullable().defaultTo('Ar');
    table.string('customer_msisdn').notNullable();
    table.string('client_transaction_id').notNullable().unique();
    table.string('server_correlation_id').notNullable().unique();
    table.enum('status', ['pending', 'completed', 'failed', 'cancelled']).notNullable().defaultTo('pending');
    table.integer('attempts').defaultTo(0);
    table.text('status_reason');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mvola_payments');
}
