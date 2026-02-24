import db from '../database';

export async function getPlanDetails(packId: string): Promise<{ limit: number }> {
  const pack = await db('packs').where({ id: packId }).first();
  return { limit: pack?.nb_downloads || 100 };
}
