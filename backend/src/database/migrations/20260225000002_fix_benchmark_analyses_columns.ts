import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('benchmark_analyses');
  if (!tableExists) return;

  const hasCreditsCost = await knex.schema.hasColumn('benchmark_analyses', 'credits_cost');
  const hasMyPageUrl = await knex.schema.hasColumn('benchmark_analyses', 'my_page_url');
  const hasMyPageName = await knex.schema.hasColumn('benchmark_analyses', 'my_page_name');
  const hasCompetitorNames = await knex.schema.hasColumn('benchmark_analyses', 'competitor_names');

  await knex.schema.alterTable('benchmark_analyses', (table) => {
    if (!hasCreditsCost) table.decimal('credits_cost', 10, 2).nullable();
    if (!hasMyPageUrl) table.string('my_page_url', 500).nullable();
    if (!hasMyPageName) table.string('my_page_name', 200).nullable();
    if (!hasCompetitorNames) table.jsonb('competitor_names').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('benchmark_analyses');
  if (!tableExists) return;

  await knex.schema.alterTable('benchmark_analyses', (table) => {
    table.dropColumns('credits_cost', 'my_page_url', 'my_page_name', 'competitor_names');
  });
}
