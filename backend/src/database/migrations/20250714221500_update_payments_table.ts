import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('payments', (table) => {
    // Ajout des colonnes manquantes identifiées dans l'erreur
    table.integer('creditsPurchased');
    table.string('packId');
    table.string('stripeCheckoutId');

    // Renommer stripe_payment_id en stripePaymentIntentId pour la clarté
    table.renameColumn('stripe_payment_id', 'stripePaymentIntentId');

    // Ajout du champ updated_at pour suivre les modifications
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('payments', (table) => {
    table.dropColumn('creditsPurchased');
    table.dropColumn('packId');
    table.dropColumn('stripeCheckoutId');
    table.renameColumn('stripePaymentIntentId', 'stripe_payment_id');
    table.dropColumn('updated_at');
  });
}
