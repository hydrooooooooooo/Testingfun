/**
 * Test COMPLET end-to-end des deux pipelines :
 *  1. Marketplace : Apify call → extractItemData() → backup file → vérification format
 *  2. Facebook Pages : Apify info + posts → data transform → backup file → vérification format
 *
 * Usage: cd backend && npx tsx scripts/test-full-pipeline.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { ApifyClient } from 'apify-client';
import fs from 'fs';
import path from 'path';

// ── Config ──────────────────────────────────────────────────────────────
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const MARKETPLACE_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'Y0QGH7cuqgKtNbEgt';
const FB_INFO_ACTOR_ID = process.env.APIFY_PAGES_INFO_ACTOR_ID || 'apify/facebook-pages-scraper';
const FB_POSTS_ACTOR_ID = process.env.APIFY_PAGES_POSTS_ACTOR_ID || 'apify/facebook-posts-scraper';

const MARKETPLACE_TEST_URL = 'https://www.facebook.com/marketplace/category/search?query=maison';
const FB_PAGE_TEST_URL = 'https://www.facebook.com/Bankofafricamadagascar';
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

const client = new ApifyClient({ token: APIFY_TOKEN });

// ── Helpers ─────────────────────────────────────────────────────────────

function ok(label: string) { console.log(`  ✅ ${label}`); }
function fail(label: string) { console.log(`  ❌ ${label}`); }
function info(label: string) { console.log(`  ℹ️  ${label}`); }

/** Poll Apify run until terminal state */
async function waitForRun(runId: string, maxMs = 300_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await client.run(runId).get();
    const st = r?.status || 'UNKNOWN';
    if (['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(st)) return st;
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return 'TIMED-OUT';
}

// ── extractItemData (copie fidèle de apifyService.ts) ───────────────────
function extractItemData(item: any): any {
  // 1. Titre
  let title = item.marketplace_listing_title || item.custom_title || item.title || item.name || '';

  // 2. Prix
  let price = 'N/A';
  if (item.listing_price?.amount !== undefined) {
    let amount = typeof item.listing_price.amount === 'string' ? parseFloat(item.listing_price.amount) : item.listing_price.amount;
    const currency = item.listing_price.currency || 'MGA';
    if (!isNaN(amount) && amount > 0) {
      price = currency === 'MGA' ? `${amount.toLocaleString('fr-FR')} MGA`
            : currency === 'USD' ? `$${amount.toLocaleString('fr-FR')}`
            : `${amount.toLocaleString('fr-FR')} ${currency}`;
    }
  } else if (item.price) {
    price = typeof item.price === 'number' ? `${item.price.toLocaleString('fr-FR')} EUR` : item.price;
  }

  // 3. Description
  let description = '';
  if (item.redacted_description?.text) description = item.redacted_description.text;
  else if (typeof item.redacted_description === 'string') description = item.redacted_description;
  else if (typeof item.description === 'string') description = item.description;

  // 4. Images
  const images: string[] = [];
  if (item.primary_listing_photo?.listing_image?.uri) images.push(item.primary_listing_photo.listing_image.uri);
  else if (item.primary_listing_photo?.image?.uri) images.push(item.primary_listing_photo.image.uri);
  if (Array.isArray(item.listing_photos)) {
    for (const p of item.listing_photos) { if (p?.image?.uri) images.push(p.image.uri); }
  }
  if (typeof item.imageUrl === 'string') images.push(item.imageUrl);
  if (typeof item.image === 'string') images.push(item.image);
  const seen = new Set<string>();
  const fixedImages: string[] = [];
  for (let u of images) {
    if (!u) continue;
    if (u.startsWith('//')) u = 'https:' + u;
    if (!seen.has(u)) { seen.add(u); fixedImages.push(u); }
    if (fixedImages.length >= 3) break;
  }

  // 5. Location
  let locationStr = 'Unknown';
  if (typeof item.location === 'string') locationStr = item.location;
  else if (item.location?.reverse_geocode_detailed?.city) locationStr = item.location.reverse_geocode_detailed.city;
  else if (item.location?.reverse_geocode?.city) locationStr = item.location.reverse_geocode.city;
  else if (item.location?.reverse_geocode?.city_page?.display_name) locationStr = item.location.reverse_geocode.city_page.display_name.split(',')[0].trim();

  // 6. URL
  const url = item.listingUrl || item.url || item.link || item.href || '';

  // 7. Date
  const postedAt = item.postedAt || item.date || '';

  return {
    title: title || 'No Title',
    price,
    desc: description || 'No Description',
    image: fixedImages[0] || '',
    images: fixedImages,
    location: locationStr,
    url,
    postedAt,
  };
}

/** Transform FB info items → format attendu par le frontend */
function transformFBInfoItem(item: any, pageName: string, url: string) {
  return {
    title: item.name || item.title || pageName || 'Facebook Page',
    price: '',
    desc: item.about || item.description || '',
    image: item.profilePic || item.profilePhoto || '',
    images: [item.profilePic, item.coverPhoto].filter(Boolean),
    location: item.address || item.location || '',
    url: url || '',
    postedAt: '',
  };
}

/** Transform FB post items → format attendu par le frontend */
function transformFBPostItem(post: any, pageName: string) {
  return {
    title: (post.text || post.message || '').substring(0, 200) || `Post from ${pageName}`,
    price: '',
    desc: post.text || post.message || '',
    image: post.photoUrl || post.imageUrl || '',
    images: (post.photos || post.images || []).slice(0, 3),
    location: '',
    url: post.url || post.postUrl || '',
    postedAt: post.time || post.date || post.createdTime || '',
  };
}

/** Required fields for normalized items */
const REQUIRED_FIELDS = ['title', 'price', 'desc', 'image', 'images', 'location', 'url', 'postedAt'];

function validateNormalizedItem(item: any, label: string): boolean {
  let valid = true;
  for (const f of REQUIRED_FIELDS) {
    if (!(f in item)) { fail(`${label}: champ "${f}" manquant`); valid = false; }
  }
  if (!Array.isArray(item.images)) { fail(`${label}: "images" n'est pas un array`); valid = false; }
  return valid;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 1 : MARKETPLACE — Pipeline complète
// ═══════════════════════════════════════════════════════════════════════
async function testMarketplacePipeline() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 1 : MARKETPLACE — Pipeline complète            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // 1. Lancer le scraping Apify
  info(`Actor: ${MARKETPLACE_ACTOR_ID}`);
  info(`URL: ${MARKETPLACE_TEST_URL}`);

  const input = {
    urls: [MARKETPLACE_TEST_URL],
    count: 5,
    deepScrape: true,
    strictFiltering: true,
    proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  };

  console.log('  Lancement du run Apify...');
  const run = await client.actor(MARKETPLACE_ACTOR_ID).start(input);
  info(`Run ID: ${run.id} | Dataset: ${run.defaultDatasetId}`);

  // 2. Attendre la fin
  console.log('  Attente completion');
  const status = await waitForRun(run.id);
  console.log(`\n  Status final: ${status}`);
  if (status !== 'SUCCEEDED') { fail('Run échoué — impossible de continuer'); return false; }
  ok('Run Apify réussi');

  // 3. Récupérer les items bruts
  const { items: rawItems } = await client.dataset(run.defaultDatasetId).listItems();
  info(`${rawItems.length} items bruts récupérés`);
  if (rawItems.length === 0) { fail('Aucun item retourné par Apify'); return false; }
  ok(`${rawItems.length} items bruts`);

  // 4. Normaliser via extractItemData()
  const normalizedItems = rawItems.map((item: any) => extractItemData(item));
  info(`${normalizedItems.length} items normalisés`);

  // 5. Valider le format de chaque item
  let allValid = true;
  for (let i = 0; i < normalizedItems.length; i++) {
    if (!validateNormalizedItem(normalizedItems[i], `Item ${i}`)) allValid = false;
  }
  if (allValid) ok('Tous les items ont le format attendu');
  else fail('Certains items ont un format invalide');

  // 6. Afficher un sample
  const sample = normalizedItems[0];
  console.log('\n  📦 Premier item normalisé:');
  console.log(`     title:    ${sample.title}`);
  console.log(`     price:    ${sample.price}`);
  console.log(`     desc:     ${(sample.desc || '').substring(0, 80)}...`);
  console.log(`     image:    ${sample.image ? '✓ présent' : '✗ vide'}`);
  console.log(`     images:   ${sample.images.length} image(s)`);
  console.log(`     location: ${sample.location}`);
  console.log(`     url:      ${sample.url ? '✓ présent' : '✗ vide'}`);
  console.log(`     postedAt: ${sample.postedAt || '(vide)'}`);

  // 7. Créer le backup file (comme scrapeController.createBackupFile)
  const sessionId = `sess_test_mkt_${Date.now()}`;
  const previewItems = normalizedItems.slice(0, 3);
  const backupData = {
    sessionId,
    datasetId: run.defaultDatasetId,
    timestamp: new Date().toISOString(),
    totalItems: normalizedItems.length,
    previewItems: previewItems.map((item: any) => ({
      title: item.title, price: item.price, desc: item.desc, image: item.image,
      images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
      location: item.location, url: item.url, postedAt: item.postedAt,
    })),
    allItems: normalizedItems.map((item: any) => ({
      title: item.title, price: item.price, desc: item.desc, image: item.image,
      images: Array.isArray(item.images) ? item.images.slice(0, 3) : [],
      location: item.location, url: item.url, postedAt: item.postedAt,
    })),
  };

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `${sessionId}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

  // 8. Relire et vérifier
  if (fs.existsSync(backupPath)) {
    const saved = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    ok(`Backup créé: ${backupPath}`);
    info(`  totalItems dans backup: ${saved.totalItems}`);
    info(`  previewItems: ${saved.previewItems.length}`);
    info(`  allItems: ${saved.allItems.length}`);
    if (saved.totalItems === normalizedItems.length && saved.allItems.length === normalizedItems.length) {
      ok('Backup complet et cohérent');
    } else {
      fail('Incohérence dans le backup');
    }
  } else {
    fail('Backup non créé');
    return false;
  }

  // Nettoyage test file
  fs.unlinkSync(backupPath);
  info('Fichier test nettoyé');

  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST 2 : FACEBOOK PAGES — Pipeline complète
// ═══════════════════════════════════════════════════════════════════════
async function testFBPagesPipeline() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST 2 : FACEBOOK PAGES — Pipeline complète         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const pageName = 'Bankofafricamadagascar';

  // 1. Lancer info scrape
  info(`Info Actor: ${FB_INFO_ACTOR_ID}`);
  info(`Posts Actor: ${FB_POSTS_ACTOR_ID}`);
  info(`Page URL: ${FB_PAGE_TEST_URL}`);

  console.log('  Lancement info + posts scrape en parallèle...');

  const [infoRun, postsRun] = await Promise.all([
    client.actor(FB_INFO_ACTOR_ID).start({ startUrls: [{ url: FB_PAGE_TEST_URL }] }),
    client.actor(FB_POSTS_ACTOR_ID).start({
      startUrls: [{ url: FB_PAGE_TEST_URL }],
      resultsLimit: 10,
      captionText: true,
    }),
  ]);

  info(`Info Run ID: ${infoRun.id} | Dataset: ${infoRun.defaultDatasetId}`);
  info(`Posts Run ID: ${postsRun.id} | Dataset: ${postsRun.defaultDatasetId}`);

  // 2. Attendre les deux runs
  console.log('  Attente completion info');
  const infoStatus = await waitForRun(infoRun.id);
  console.log(`\n  Info status: ${infoStatus}`);
  if (infoStatus !== 'SUCCEEDED') fail(`Info run échoué: ${infoStatus}`);
  else ok('Info scrape réussi');

  console.log('  Attente completion posts');
  const postsStatus = await waitForRun(postsRun.id);
  console.log(`\n  Posts status: ${postsStatus}`);
  if (postsStatus !== 'SUCCEEDED') fail(`Posts run échoué: ${postsStatus}`);
  else ok('Posts scrape réussi');

  // 3. Récupérer les données brutes
  const { items: rawInfoItems } = await client.dataset(infoRun.defaultDatasetId).listItems();
  const { items: rawPostsItems } = await client.dataset(postsRun.defaultDatasetId).listItems();
  info(`Info items bruts: ${rawInfoItems.length}`);
  info(`Posts items bruts: ${rawPostsItems.length}`);

  // 4. Transformer les données (comme facebookPagesController.launchPipeline)
  const infoData = rawInfoItems;
  const postsData = rawPostsItems;

  // Transform pour la persistence
  const transformedInfoItems = infoData.map((item: any) => transformFBInfoItem(item, pageName, FB_PAGE_TEST_URL));
  const transformedPostItems = postsData.map((post: any) => transformFBPostItem(post, pageName));

  info(`Info items transformés: ${transformedInfoItems.length}`);
  info(`Post items transformés: ${transformedPostItems.length}`);

  // 5. Valider le format
  let allValid = true;
  for (let i = 0; i < transformedInfoItems.length; i++) {
    if (!validateNormalizedItem(transformedInfoItems[i], `FB Info ${i}`)) allValid = false;
  }
  for (let i = 0; i < transformedPostItems.length; i++) {
    if (!validateNormalizedItem(transformedPostItems[i], `FB Post ${i}`)) allValid = false;
  }
  if (allValid) ok('Tous les items FB ont le format attendu');
  else fail('Certains items FB ont un format invalide');

  // 6. Afficher samples
  if (transformedInfoItems.length > 0) {
    const infoSample = transformedInfoItems[0];
    console.log('\n  📄 Page Info normalisée:');
    console.log(`     title:    ${infoSample.title}`);
    console.log(`     desc:     ${(infoSample.desc || '').substring(0, 100)}...`);
    console.log(`     image:    ${infoSample.image ? '✓ présent' : '✗ vide'}`);
    console.log(`     location: ${infoSample.location || '(vide)'}`);
  }
  if (transformedPostItems.length > 0) {
    const postSample = transformedPostItems[0];
    console.log('\n  📝 Premier post normalisé:');
    console.log(`     title:    ${postSample.title.substring(0, 80)}...`);
    console.log(`     image:    ${postSample.image ? '✓ présent' : '✗ vide'}`);
    console.log(`     url:      ${postSample.url ? '✓ présent' : '✗ vide'}`);
    console.log(`     postedAt: ${postSample.postedAt || '(vide)'}`);
  }

  // Afficher les clés brutes du premier post pour diagnostic
  if (rawPostsItems.length > 0) {
    console.log('\n  🔑 Clés brutes du premier post Apify:');
    console.log(`     ${Object.keys(rawPostsItems[0]).slice(0, 20).join(', ')}`);
  }

  // 7. Créer le backup file (comme facebookPagesService.saveBackup)
  const sessionId = `sess_test_fb_${Date.now()}`;
  const subSessions = [{
    pageName,
    url: FB_PAGE_TEST_URL,
    infoRunId: infoRun.id,
    infoDatasetId: infoRun.defaultDatasetId,
    infoStatus,
    infoData,
    postsRunId: postsRun.id,
    postsDatasetId: postsRun.defaultDatasetId,
    postsStatus,
    postsData,
  }];

  const backupData = {
    sessionId,
    timestamp: new Date().toISOString(),
    totalPages: subSessions.length,
    subSessions,
  };

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(BACKUP_DIR, `fbpages_${sessionId}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

  // 8. Relire et vérifier
  if (fs.existsSync(backupPath)) {
    const saved = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    ok(`Backup créé: ${backupPath}`);
    info(`  totalPages: ${saved.totalPages}`);
    info(`  subSessions: ${saved.subSessions.length}`);
    const sub = saved.subSessions[0];
    info(`  infoData items: ${sub.infoData?.length || 0}`);
    info(`  postsData items: ${sub.postsData?.length || 0}`);

    if (sub.infoData?.length > 0 && sub.postsData?.length > 0) {
      ok('Backup complet avec info + posts');
    } else if (sub.infoData?.length > 0 || sub.postsData?.length > 0) {
      info('Backup partiel (une des deux sources vide)');
    } else {
      fail('Backup vide');
    }
  } else {
    fail('Backup non créé');
    return false;
  }

  // Nettoyage test file
  fs.unlinkSync(backupPath);
  info('Fichier test nettoyé');

  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  TEST PIPELINE COMPLÈTE — Marketplace + FB Pages     ║');
  console.log('║  Apify → Normalisation → Backup → Validation        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  if (!APIFY_TOKEN) {
    fail('APIFY_TOKEN manquant dans .env');
    process.exit(1);
  }
  ok(`APIFY_TOKEN: ${APIFY_TOKEN.substring(0, 8)}...`);

  const mktResult = await testMarketplacePipeline();
  const fbResult = await testFBPagesPipeline();

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  RÉSUMÉ                                              ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Marketplace : ${mktResult ? '✅ OK' : '❌ ÉCHEC'}                                 ║`);
  console.log(`║  FB Pages    : ${fbResult ? '✅ OK' : '❌ ÉCHEC'}                                 ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
}

main().catch(e => {
  console.error('❌ Erreur fatale:', e);
  process.exit(1);
});
