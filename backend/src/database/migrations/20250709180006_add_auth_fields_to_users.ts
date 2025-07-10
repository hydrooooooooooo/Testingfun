import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('password_hash').nullable();
    table.string('name').nullable();
    table.string('role').notNullable().defaultTo('user');
    table.integer('credits').notNullable().defaultTo(0);

    // Timestamps (created_at, updated_at)
    table.timestamps(true, true);
    table.timestamp('last_login').nullable();

    // Email Verification
    table.timestamp('email_verified_at').nullable();
    table.string('verification_token').nullable();
    table.timestamp('verification_token_expires_at').nullable();

    // Password Reset
    table.string('reset_token').nullable();
    table.timestamp('reset_token_expires_at').nullable();

    // Profile & Subscription
    table.string('profile_image').nullable();
    table.string('subscription_status').notNullable().defaultTo('free');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}

