import { ApifyClient } from 'apify-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

async function runRawScrape() {
  try {
    const url = process.argv[2];
    const countArg = process.argv[3];
    const waitSecArg = process.argv[4];

    if (!url) {
      console.error('Usage: ts-node-dev src/scripts/runRawScrape.ts <marketplace_url> [count] [waitSeconds]');
      process.exit(1);
    }

    const count = countArg ? parseInt(countArg, 10) : 20;
    const waitSeconds = waitSecArg ? parseInt(waitSecArg, 10) : 120; // wait up to 2 minutes by default

    if (!config.api.apifyToken) {
      throw new Error('APIFY_TOKEN is missing in environment');
    }
    if (!config.api.apifyActorId) {
      throw new Error('APIFY_ACTOR_ID is missing in environment');
    }

    const client = new ApifyClient({ token: config.api.apifyToken });

    logger.info('Starting Apify actor for raw scrape', {
      actorId: config.api.apifyActorId,
      url,
      count,
      waitSeconds,
    });

    const input: any = {
      urls: [url],
      count,
      deepScrape: count > 5,
      getProfileUrls: false,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    };

    const run = await client.actor(config.api.apifyActorId!).start(input, {
      build: 'latest',
      memory: 2048,
      waitForFinish: waitSeconds,
    });

    logger.info('Actor started', { runId: run.id, status: run.status, datasetId: run.defaultDatasetId });

    // If still running, poll briefly up to an extra minute
    let finalRun = run;
    const endBy = Date.now() + 60_000;
    while (finalRun.status === 'RUNNING' && Date.now() < endBy) {
      await new Promise((r) => setTimeout(r, 5000));
      const polled = await client.run(run.id).get();
      if (!polled) break;
      finalRun = polled;
      logger.info('Polling run status', { status: finalRun.status });
    }

    if (finalRun.status !== 'SUCCEEDED') {
      logger.warn('Run did not finish successfully. Dumping whatever is in the dataset so far.', { status: finalRun.status });
    }

    if (!finalRun.defaultDatasetId) {
      throw new Error('No datasetId returned by Apify run');
    }

    const { items } = await client.dataset(finalRun.defaultDatasetId).listItems({});
    logger.info(`Retrieved ${items.length} raw items from dataset ${finalRun.defaultDatasetId}`);

    const outDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, `raw_apify_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(outfile, JSON.stringify(items, null, 2));
    logger.info(`Raw output saved to ${outfile}`);

    // Also print the output path for convenience
    console.log(outfile);
  } catch (err) {
    logger.error('runRawScrape failed', err);
    process.exit(1);
  }
}

runRawScrape();
