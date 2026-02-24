import { Knex } from 'knex';
import { PLANS } from '../../config/plans';

export async function seed(knex: Knex): Promise<void> {
    // Deletes ALL existing entries
    await knex('packs').del();

    // Inserts seed entries with EUR and MGA Stripe Price IDs
    const packsToInsert = PLANS.map(plan => ({
        id: plan.id,
        name: plan.name,
        nb_downloads: plan.nbDownloads,
        price: plan.price,
        price_eur: plan.priceEur,
        currency: plan.currency,
        price_label: plan.priceLabel,
        description: plan.description,
        popular: plan.popular || false,
        stripe_price_id: plan.stripePriceId,
        stripe_price_id_mga: plan.stripePriceIdMga || null,
    }));

    await knex('packs').insert(packsToInsert);
}
