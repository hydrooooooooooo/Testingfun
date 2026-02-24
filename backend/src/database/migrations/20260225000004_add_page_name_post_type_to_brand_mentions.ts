import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasPageName = await knex.schema.hasColumn('brand_mentions', 'page_name');
  if (!hasPageName) {
    await knex.schema.alterTable('brand_mentions', (table) => {
      table.string('page_name').nullable();
      table.string('post_type').nullable().defaultTo('post');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('brand_mentions', (table) => {
    table.dropColumn('page_name');
    table.dropColumn('post_type');
  });
}
