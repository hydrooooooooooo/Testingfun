/**
 * Script de diagnostic — teste les pipelines Apify Marketplace + Facebook Pages
 * Usage: cd backend && npx ts-node scripts/test-apify-pipelines.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { ApifyClient } from 'apify-client';
import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const MARKETPLACE_ACTOR_ID = process.env.APIFY_ACTOR_ID;
const FB_PAGES_INFO_ACTOR_ID = process.env.APIFY_PAGES_INFO_ACTOR_ID || 'apify/facebook-pages-scraper';
const FB_PAGES_POSTS_ACTOR_ID = process.env.APIFY_PAGES_POSTS_ACTOR_ID || 'apify/facebook-posts-scraper';

// Pages de test
const TEST_MARKETPLACE_URL = 'https://www.facebook.com/marketplace/antananarivo/search?query=voiture';
const TEST_FB_PAGE_URL = 'https://www.facebook.com/cocacola';

const DIVIDER = '='.repeat(60);

function log(section: string, msg: string, data?: any) {
  console.log(`[${section}] ${msg}`);
  if (data !== undefined) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      console.log(String(data).substring(0, 500));
    }
  }
}

function logError(section: string, msg: string, err: any) {
  console.error(`[${section}] ❌ ${msg}`);
  if (err?.response?.data) {
    console.error(JSON.stringify(err.response.data, null, 2).substring(0, 500));
  } else if (err?.message) {
    console.error(err.message);
  }
}

async function waitForRun(client: ApifyClient, runId: string, label: string, timeoutMs = 120000): Promise<any> {
  const start = Date.now();
  let status = 'RUNNING';
  let attempts = 0;

  while (['RUNNING', 'READY'].includes(status) && (Date.now() - start) < timeoutMs) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;
    const run = await client.run(runId).get();
    status = run?.status || 'UNKNOWN';
    log(label, `  Poll #${attempts}: status=${status}`);
  }

  if (status === 'SUCCEEDED') {
    return { success: true, status };
  }
  return { success: false, status };
}

// ====================== TEST 1: MARKETPLACE ======================
async function testMarketplace() {
  console.log(`\n${DIVIDER}`);
  console.log('TEST 1 : MARKETPLACE SCRAPING');
  console.log(DIVIDER);

  if (!APIFY_TOKEN) {
    log('MARKETPLACE', '❌ APIFY_TOKEN manquant');
    return;
  }
  if (!MARKETPLACE_ACTOR_ID) {
    log('MARKETPLACE', '❌ APIFY_ACTOR_ID manquant');
    return;
  }

  log('MARKETPLACE', `Token: ${APIFY_TOKEN.substring(0, 8)}...`);
  log('MARKETPLACE', `Actor ID: ${MARKETPLACE_ACTOR_ID}`);
  log('MARKETPLACE', `URL test: ${TEST_MARKETPLACE_URL}`);
  log('MARKETPLACE', `Limite: 3 items`);

  const client = new ApifyClient({ token: APIFY_TOKEN });

  // Étape 1: Vérifier que l'acteur existe
  log('MARKETPLACE', '\n📋 Étape 1: Vérifier l\'acteur...');
  try {
    const actor = await client.actor(MARKETPLACE_ACTOR_ID).get();
    if (!actor) {
      log('MARKETPLACE', `❌ Acteur ${MARKETPLACE_ACTOR_ID} introuvable`);
      return;
    }
    log('MARKETPLACE', `✅ Acteur trouvé: ${actor.name} (v${actor.versions?.[actor.versions.length - 1]?.versionNumber || '?'})`);
  } catch (err: any) {
    logError('MARKETPLACE', `Acteur ${MARKETPLACE_ACTOR_ID} inaccessible`, err);
    return;
  }

  // Étape 2: Lancer le run
  log('MARKETPLACE', '\n🚀 Étape 2: Lancer le scraping...');
  const input = {
    urls: [TEST_MARKETPLACE_URL],
    count: 3,
    deepScrape: true,
    strictFiltering: true,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL']
    }
  };
  log('MARKETPLACE', 'Input:', input);

  let runId: string;
  let datasetId: string;
  try {
    const run = await client.actor(MARKETPLACE_ACTOR_ID).start(input);
    runId = run.id;
    datasetId = run.defaultDatasetId;
    log('MARKETPLACE', `✅ Run démarré: runId=${runId}, datasetId=${datasetId}`);
  } catch (err: any) {
    logError('MARKETPLACE', 'Échec démarrage du run', err);
    return;
  }

  // Étape 3: Attendre la fin
  log('MARKETPLACE', '\n⏳ Étape 3: Attendre la fin (max 2 min)...');
  const result = await waitForRun(client, runId, 'MARKETPLACE');

  if (!result.success) {
    log('MARKETPLACE', `❌ Run terminé avec status: ${result.status}`);
    // Récupérer les logs du run
    try {
      const logText = await client.run(runId).log().get();
      log('MARKETPLACE', 'Dernières lignes du log:', logText?.substring(logText.length - 500));
    } catch {}
    return;
  }

  // Étape 4: Récupérer les données
  log('MARKETPLACE', '\n📦 Étape 4: Récupérer les données du dataset...');
  try {
    const { items } = await client.dataset(datasetId).listItems();
    log('MARKETPLACE', `✅ ${items.length} items récupérés`);

    if (items.length > 0) {
      log('MARKETPLACE', '\n📄 Premier item (clés):');
      log('MARKETPLACE', '', Object.keys(items[0]));
      log('MARKETPLACE', '\nPremier item (aperçu):');
      const first = items[0] as any;
      log('MARKETPLACE', '', {
        title: first.marketplace_listing_title || first.title || first.name || '???',
        price: first.listing_price || first.price || '???',
        location: first.reverse_geocode?.city || first.location || '???',
        url: first.url || first.marketplace_listing_url || '???',
        hasImage: !!(first.primary_listing_photo || first.images),
      });
    } else {
      log('MARKETPLACE', '⚠️ Dataset vide — 0 items retournés');
    }
  } catch (err: any) {
    logError('MARKETPLACE', 'Échec récupération dataset', err);
  }
}

// ====================== TEST 2: FACEBOOK PAGES ======================
async function testFacebookPages() {
  console.log(`\n${DIVIDER}`);
  console.log('TEST 2 : FACEBOOK PAGES SCRAPING');
  console.log(DIVIDER);

  if (!APIFY_TOKEN) {
    log('FB-PAGES', '❌ APIFY_TOKEN manquant');
    return;
  }

  log('FB-PAGES', `Info Actor: ${FB_PAGES_INFO_ACTOR_ID}`);
  log('FB-PAGES', `Posts Actor: ${FB_PAGES_POSTS_ACTOR_ID}`);
  log('FB-PAGES', `URL test: ${TEST_FB_PAGE_URL}`);

  const client = new ApifyClient({ token: APIFY_TOKEN });

  // ----- Test A: Page Info -----
  log('FB-PAGES', '\n--- A) Scraping INFO de la page ---');

  // Vérifier acteur info
  try {
    const actor = await client.actor(FB_PAGES_INFO_ACTOR_ID).get();
    if (!actor) {
      log('FB-PAGES', `❌ Acteur INFO ${FB_PAGES_INFO_ACTOR_ID} introuvable`);
    } else {
      log('FB-PAGES', `✅ Acteur INFO trouvé: ${actor.name}`);
    }
  } catch (err: any) {
    logError('FB-PAGES', `Acteur INFO inaccessible`, err);
  }

  let infoRunId: string | null = null;
  let infoDatasetId: string | null = null;
  try {
    const infoInput = {
      startUrls: [{ url: TEST_FB_PAGE_URL }]
    };
    log('FB-PAGES', 'Input Info:', infoInput);
    const run = await client.actor(FB_PAGES_INFO_ACTOR_ID).start(infoInput);
    infoRunId = run.id;
    infoDatasetId = run.defaultDatasetId;
    log('FB-PAGES', `✅ Info run démarré: runId=${infoRunId}, datasetId=${infoDatasetId}`);
  } catch (err: any) {
    logError('FB-PAGES', 'Échec démarrage info run', err);
  }

  // ----- Test B: Posts -----
  log('FB-PAGES', '\n--- B) Scraping POSTS de la page ---');

  // Vérifier acteur posts
  try {
    const actor = await client.actor(FB_PAGES_POSTS_ACTOR_ID).get();
    if (!actor) {
      log('FB-PAGES', `❌ Acteur POSTS ${FB_PAGES_POSTS_ACTOR_ID} introuvable`);
    } else {
      log('FB-PAGES', `✅ Acteur POSTS trouvé: ${actor.name}`);
    }
  } catch (err: any) {
    logError('FB-PAGES', `Acteur POSTS inaccessible`, err);
  }

  let postsRunId: string | null = null;
  let postsDatasetId: string | null = null;
  try {
    const postsInput = {
      startUrls: [{ url: TEST_FB_PAGE_URL }],
      resultsLimit: 5,
      captionText: true,
    };
    log('FB-PAGES', 'Input Posts:', postsInput);
    const run = await client.actor(FB_PAGES_POSTS_ACTOR_ID).start(postsInput);
    postsRunId = run.id;
    postsDatasetId = run.defaultDatasetId;
    log('FB-PAGES', `✅ Posts run démarré: runId=${postsRunId}, datasetId=${postsDatasetId}`);
  } catch (err: any) {
    logError('FB-PAGES', 'Échec démarrage posts run', err);
  }

  // Attendre les deux runs
  log('FB-PAGES', '\n⏳ Attente des runs (max 2 min chacun)...');

  if (infoRunId) {
    const infoResult = await waitForRun(client, infoRunId, 'FB-INFO');
    if (infoResult.success && infoDatasetId) {
      try {
        const { items } = await client.dataset(infoDatasetId).listItems();
        log('FB-INFO', `✅ ${items.length} items info récupérés`);
        if (items.length > 0) {
          const info = items[0] as any;
          log('FB-INFO', 'Données page:', {
            name: info.name || info.title || '???',
            followers: info.followers || info.followersCount || '???',
            likes: info.likes || info.likesCount || '???',
            category: info.categories || info.category || '???',
            about: (info.about || '???').substring(0, 100),
            keys: Object.keys(info).slice(0, 20),
          });
        }
      } catch (err: any) {
        logError('FB-INFO', 'Échec récupération info dataset', err);
      }
    } else {
      log('FB-INFO', `❌ Info run: ${infoResult.status}`);
      try {
        const logText = await client.run(infoRunId).log().get();
        log('FB-INFO', 'Log:', logText?.substring(logText.length - 500));
      } catch {}
    }
  }

  if (postsRunId) {
    const postsResult = await waitForRun(client, postsRunId, 'FB-POSTS');
    if (postsResult.success && postsDatasetId) {
      try {
        const { items } = await client.dataset(postsDatasetId).listItems();
        log('FB-POSTS', `✅ ${items.length} posts récupérés`);
        if (items.length > 0) {
          const post = items[0] as any;
          log('FB-POSTS', 'Premier post:', {
            text: (post.text || post.message || '???').substring(0, 100),
            likes: post.likes || post.likesCount || '???',
            comments: post.comments || post.commentsCount || '???',
            shares: post.shares || post.sharesCount || '???',
            date: post.time || post.timestamp || post.postedAt || '???',
            url: post.url || post.postUrl || '???',
            keys: Object.keys(post).slice(0, 20),
          });
        }
      } catch (err: any) {
        logError('FB-POSTS', 'Échec récupération posts dataset', err);
      }
    } else {
      log('FB-POSTS', `❌ Posts run: ${postsResult.status}`);
      try {
        const logText = await client.run(postsRunId).log().get();
        log('FB-POSTS', 'Log:', logText?.substring(logText.length - 500));
      } catch {}
    }
  }
}

// ====================== TEST 3: MARKETPLACE via raw axios (comme apifyService.ts) ======================
async function testMarketplaceRawAxios() {
  console.log(`\n${DIVIDER}`);
  console.log('TEST 3 : MARKETPLACE via raw axios (comme le code actuel)');
  console.log(DIVIDER);

  if (!APIFY_TOKEN || !MARKETPLACE_ACTOR_ID) {
    log('RAW-AXIOS', '❌ Token ou Actor ID manquant');
    return;
  }

  const input = {
    urls: [TEST_MARKETPLACE_URL],
    count: 3,
    deepScrape: true,
    strictFiltering: true,
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL']
    }
  };

  log('RAW-AXIOS', `POST https://api.apify.com/v2/acts/${MARKETPLACE_ACTOR_ID}/runs`);
  log('RAW-AXIOS', 'Body:', input);

  try {
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${MARKETPLACE_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      input,
      { timeout: 60000 }
    );

    const runId = response.data?.data?.id;
    const datasetId = response.data?.data?.defaultDatasetId;
    log('RAW-AXIOS', `✅ Response status: ${response.status}`);
    log('RAW-AXIOS', `   runId: ${runId}`);
    log('RAW-AXIOS', `   datasetId: ${datasetId}`);

    if (!runId) {
      log('RAW-AXIOS', '❌ Pas de runId dans la réponse');
      log('RAW-AXIOS', 'Full response:', response.data);
      return;
    }

    // Attendre
    log('RAW-AXIOS', '\n⏳ Attente du run...');
    let status = 'RUNNING';
    let attempts = 0;
    while (['RUNNING', 'READY'].includes(status) && attempts < 24) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
      const statusResp = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      status = statusResp.data?.data?.status || 'UNKNOWN';
      log('RAW-AXIOS', `  Poll #${attempts}: ${status}`);
    }

    if (status === 'SUCCEEDED') {
      const dataResp = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
      );
      const items = dataResp.data || [];
      log('RAW-AXIOS', `✅ ${items.length} items récupérés via axios`);
      if (items.length > 0) {
        log('RAW-AXIOS', 'Clés premier item:', Object.keys(items[0]));
      }
    } else {
      log('RAW-AXIOS', `❌ Status final: ${status}`);
    }
  } catch (err: any) {
    logError('RAW-AXIOS', 'Requête échouée', err);
  }
}

// ====================== MAIN ======================
async function main() {
  console.log(DIVIDER);
  console.log('DIAGNOSTIC APIFY — Marketplace + Facebook Pages');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(DIVIDER);

  console.log('\n📋 CONFIGURATION:');
  console.log(`  APIFY_TOKEN: ${APIFY_TOKEN ? APIFY_TOKEN.substring(0, 8) + '...' : '❌ MANQUANT'}`);
  console.log(`  MARKETPLACE_ACTOR_ID: ${MARKETPLACE_ACTOR_ID || '❌ MANQUANT'}`);
  console.log(`  FB_PAGES_INFO_ACTOR_ID: ${FB_PAGES_INFO_ACTOR_ID}`);
  console.log(`  FB_PAGES_POSTS_ACTOR_ID: ${FB_PAGES_POSTS_ACTOR_ID}`);

  // Lancer les 3 tests séquentiellement
  await testMarketplace();
  await testFacebookPages();
  await testMarketplaceRawAxios();

  console.log(`\n${DIVIDER}`);
  console.log('DIAGNOSTIC TERMINÉ');
  console.log(DIVIDER);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
