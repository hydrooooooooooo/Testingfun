import { apifyService } from '../services/apifyService';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const datasetId = process.argv[2];
    if (!datasetId) {
      console.error('Usage: ts-node-dev src/scripts/normalizeFromDataset.ts <datasetId>');
      process.exit(1);
    }

    logger.info('Fetching and normalizing items from dataset', { datasetId });
    const items = await apifyService.getDatasetItems(datasetId);
    const preview = items.slice(0, 3);

    const outDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outfile = path.join(outDir, `normalized_from_${datasetId}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

    const data = {
      datasetId,
      totalItems: items.length,
      previewItems: preview,
      allItems: items,
    };

    fs.writeFileSync(outfile, JSON.stringify(data, null, 2));
    logger.info(`Normalized output saved to ${outfile}`);
    console.log(outfile);
  } catch (err) {
    logger.error('normalizeFromDataset failed', err);
    process.exit(1);
  }
}

run();
