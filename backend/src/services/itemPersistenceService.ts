import db from '../database';
import { logger } from '../utils/logger';

interface NormalizedItem {
  title: string;
  price: string;
  desc: string;
  image: string;
  images: string[];
  location: string;
  url: string;
  postedAt: string;
}

/**
 * Persist normalized Apify items into the scraped_items table.
 * Designed to be called from any controller after a successful scrape.
 *
 * @param sessionId - The scraping session ID (FK to scraping_sessions)
 * @param userId - The user who owns these items (FK to users)
 * @param items - Array of normalized items (output of extractItemData or equivalent)
 * @param itemType - Classification: 'marketplace', 'facebook_page_info', 'facebook_page_post'
 * @param rawItems - Optional parallel array of raw Apify items (for raw_data column)
 */
export async function persistScrapedItems(
  sessionId: string,
  userId: number,
  items: NormalizedItem[],
  itemType: string,
  rawItems?: any[]
): Promise<number> {
  if (!items || items.length === 0) return 0;

  try {
    const rows = items.map((item, index) => ({
      session_id: sessionId,
      user_id: userId,
      title: (item.title || 'No Title').substring(0, 500),
      price: item.price ? item.price.substring(0, 100) : null,
      description: item.desc || null,
      location: item.location ? item.location.substring(0, 255) : null,
      url: item.url ? item.url.substring(0, 1024) : null,
      posted_at: item.postedAt || null,
      image_url: item.image ? item.image.substring(0, 1024) : null,
      images: JSON.stringify(item.images || []),
      item_type: itemType,
      raw_data: rawItems?.[index] ? JSON.stringify(rawItems[index]) : null,
      metadata: null,
      is_favorite: false,
      user_notes: null,
      position: index,
    }));

    // Batch insert in chunks of 100 to avoid query-size limits
    const CHUNK_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await db('scraped_items').insert(chunk);
      inserted += chunk.length;
    }

    logger.info(`[PERSISTENCE] Persisted ${inserted} items for session ${sessionId} (type: ${itemType})`);
    return inserted;
  } catch (error: any) {
    // If table doesn't exist yet (migration not run), log warning but don't crash
    if (error?.message?.includes('no such table') || error?.code === '42P01') {
      logger.warn(`[PERSISTENCE] scraped_items table not found — run migrations. Skipping persistence for session ${sessionId}`);
      return 0;
    }
    logger.error(`[PERSISTENCE] Failed to persist items for session ${sessionId}:`, error);
    return 0;
  }
}
