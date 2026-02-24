import dotenv from 'dotenv';
dotenv.config();
import { ApifyClient } from 'apify-client';

async function test() {
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
  const actorId = process.env.APIFY_ACTOR_ID || '';

  const input = {
    urls: ['https://www.facebook.com/marketplace/category/search?query=maison'],
    count: 5,
    deepScrape: true,
    strictFiltering: true,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
  };

  console.log('Actor:', actorId);
  console.log('Input:', JSON.stringify(input, null, 2));
  console.log('Lancement du run...');

  const run = await client.actor(actorId).start(input);
  console.log('Run ID:', run.id, '| Dataset:', run.defaultDatasetId);

  let status = 'RUNNING';
  while (['RUNNING', 'READY'].includes(status)) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await client.run(run.id).get();
    status = r?.status || 'UNKNOWN';
    console.log('Poll:', status);
  }

  if (status === 'SUCCEEDED') {
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`\n${items.length} items récupérés`);
    if (items.length > 0) {
      const first = items[0] as any;
      console.log('Premier item:', {
        title: first.marketplace_listing_title || first.title || first.name,
        price: first.listing_price?.amount || first.price,
        location: first.reverse_geocode?.city || first.location,
        keys: Object.keys(first).slice(0, 15),
      });
    } else {
      console.log('Dataset vide');
    }
  } else {
    console.log('Run echoue:', status);
    const logText = await client.run(run.id).log().get();
    console.log('Log (fin):', logText?.substring(logText.length - 500));
  }
}

test().catch(e => console.error(e));
