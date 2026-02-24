import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('packs', (table) => {
    table.string('stripe_price_id_mga').nullable();
    table.decimal('price_eur', 14, 2).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('packs', (table) => {
    table.dropColumn('stripe_price_id_mga');
    table.dropColumn('price_eur');
  });
}
