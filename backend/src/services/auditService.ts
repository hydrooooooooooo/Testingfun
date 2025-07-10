import knex from '../database';
import { logger } from '../utils/logger';

export interface Purchase {
  id?: number;
  user_id: number;
  session_id: string;
  pack_id: string;
  payment_intent_id: string;
  amount_paid: number;
  currency: string;
  download_url: string;
  purchased_at?: Date;
}

export class AuditService {

  /**
   * Records a successful purchase in the database.
   */
  async recordPurchase(purchaseData: Omit<Purchase, 'id' | 'purchased_at'>): Promise<Purchase> {
    try {
      const [newPurchase] = await knex('user_purchases')
        .insert(purchaseData)
        .returning('*');
      
      logger.info(`New purchase recorded for user ${purchaseData.user_id}, session ${purchaseData.session_id}`);
      return newPurchase;
    } catch (error) {
      logger.error('Failed to record purchase:', error);
      throw new Error('Could not record the purchase in the database.');
    }
  }

  /**
   * Retrieves all purchases for a given user.
   */
  async getUserPurchases(userId: number): Promise<Purchase[]> {
    try {
      const purchases = await knex('user_purchases')
        .where({ user_id: userId })
        .orderBy('purchased_at', 'desc');
        
      logger.info(`Retrieved ${purchases.length} purchases for user ${userId}`);
      return purchases;
    } catch (error) {
      logger.error(`Failed to retrieve purchases for user ${userId}:`, error);
      throw new Error('Could not retrieve user purchases.');
    }
  }
}

export const auditService = new AuditService();