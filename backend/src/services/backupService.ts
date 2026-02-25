import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

const BACKUP_DIR = path.join(__dirname, '../../data/backups');

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Save a Facebook Pages session backup (full sub-sessions with all raw data).
 */
export function saveFacebookPagesBackup(sessionId: string, subSessions: any[]): void {
  try {
    ensureBackupDir();
    const filePath = path.join(BACKUP_DIR, `fbpages_${sessionId}.json`);
    const data = {
      sessionId,
      timestamp: new Date().toISOString(),
      totalPages: subSessions.length,
      subSessions,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`[BACKUP] Facebook Pages saved: fbpages_${sessionId}.json`);
  } catch (error) {
    logger.error(`[BACKUP] Failed to save Facebook Pages backup for ${sessionId}:`, error);
  }
}

/**
 * Save a Marketplace session backup (full raw items from Apify).
 */
export function saveMarketplaceBackup(
  sessionId: string,
  datasetId: string,
  rawItems: any[]
): void {
  try {
    ensureBackupDir();
    const filePath = path.join(BACKUP_DIR, `${sessionId}.json`);

    // Don't overwrite existing backup (polling + webhook race guard)
    if (fs.existsSync(filePath)) {
      logger.info(`[BACKUP] Marketplace backup already exists for ${sessionId}, skipping`);
      return;
    }

    const data = {
      sessionId,
      datasetId,
      timestamp: new Date().toISOString(),
      totalItems: rawItems.length,
      items: rawItems,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`[BACKUP] Marketplace saved: ${sessionId}.json (${rawItems.length} items)`);
  } catch (error) {
    logger.error(`[BACKUP] Failed to save Marketplace backup for ${sessionId}:`, error);
  }
}

/**
 * Read a backup file by session ID and type.
 */
export function readBackup(sessionId: string, type: 'fbpages' | 'marketplace'): any | null {
  try {
    if (!/^sess_[A-Za-z0-9_-]+$/.test(sessionId)) return null;
    const prefix = type === 'fbpages' ? 'fbpages_' : '';
    const filePath = path.join(BACKUP_DIR, `${prefix}${sessionId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}
