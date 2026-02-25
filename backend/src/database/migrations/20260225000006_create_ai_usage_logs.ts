import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('ai_usage_logs');
  if (exists) return;

  await knex.schema.createTable('ai_usage_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_id', 255).nullable();
    table.string('generation_id', 255).notNullable();
    table.string('model', 255).notNullable();
    table.string('agent_type', 50).notNullable().defaultTo('other');
    table.integer('tokens_prompt').defaultTo(0);
    table.integer('tokens_completion').defaultTo(0);
    table.integer('tokens_total').defaultTo(0);
    table.decimal('cost_usd', 10, 6).defaultTo(0);
    table.decimal('cost_eur', 10, 6).defaultTo(0);
    table.decimal('credits_charged', 10, 2).defaultTo(0);
    table.string('page_name', 255).nullable();
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('session_id');
    table.index('created_at');
    table.index('agent_type');
    table.index('model');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_usage_logs');
}
