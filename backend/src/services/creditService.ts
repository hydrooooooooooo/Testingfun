import db from '../database';
import { logger } from '../utils/logger';
import { COST_MATRIX, calculateSimpleCost } from './costEstimationService';

// Constantes du système de crédits - DEPRECATED: Utiliser COST_MATRIX de costEstimationService
// Gardé pour compatibilité arrière uniquement
export const CREDIT_COSTS = {
  FACEBOOK_POST: COST_MATRIX.facebook_posts.perPost,
  FACEBOOK_PAGE: COST_MATRIX.facebook_pages.perPage,
  MARKETPLACE_ITEM: COST_MATRIX.marketplace.perItem,
} as const;

export const TRIAL_CREDITS = {
  FACEBOOK_POSTS: 1,      // 2 posts = 1 crédit
  FACEBOOK_PAGES: 0.5,    // 1 page = 0.5 crédit
  MARKETPLACE: 2.5,       // 5 items = 2.5 crédits
  TOTAL: 4,               // Total: 4 crédits
  EXPIRATION_DAYS: 7,
} as const;

export type TransactionType = 
  | 'trial_grant' 
  | 'purchase' 
  | 'usage' 
  | 'refund' 
  | 'admin_adjustment' 
  | 'expiration';

export type ServiceType = 
  | 'facebook_posts' 
  | 'facebook_pages' 
  | 'facebook_pages_benchmark'  // Agent 2: Analyse Concurrence
  | 'facebook_pages_calendar'   // Agent 3: Calendrier Éditorial (futur)
  | 'facebook_pages_copywriting' // Agent 4: Optimiseur Copywriting (futur)
  | 'marketplace';

export type TransactionStatus = 'completed' | 'reserved' | 'refunded';

export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  transaction_type: TransactionType;
  service_type?: ServiceType;
  reference_id?: string;
  status: TransactionStatus;
  description?: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreditBalance {
  total: number;
  trial: number;
  purchased: number;
  trial_expires_at?: Date | null;
}

export class CreditService {
  /**
   * Obtenir le solde de crédits d'un utilisateur
   */
  async getUserCredits(userId: number): Promise<number> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }
    return parseFloat(user.credits_balance || user.credits || 0);
  }

  /**
   * Obtenir le détail du solde (essai + achetés)
   */
  async getUserCreditBalance(userId: number): Promise<CreditBalance> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    const totalBalance = parseFloat(user.credits_balance || user.credits || 0);
    
    // Calculer les crédits d'essai restants
    let trialCredits = 0;
    if (user.trial_credits_granted && user.trial_credits_expires_at) {
      const expiresAt = new Date(user.trial_credits_expires_at);
      if (expiresAt > new Date()) {
        const trialTransactions = await db('credit_transactions')
          .where({ 
            user_id: userId, 
            transaction_type: 'trial_grant' 
          })
          .sum('amount as total');
        
        const trialUsage = await db('credit_transactions')
          .where({ 
            user_id: userId, 
            transaction_type: 'usage' 
          })
          .where('created_at', '<=', expiresAt)
          .sum('amount as total');
        
        const granted = parseFloat(trialTransactions[0]?.total || 0);
        const used = Math.abs(parseFloat(trialUsage[0]?.total || 0));
        trialCredits = Math.max(0, granted - used);
      }
    }

    return {
      total: totalBalance,
      trial: trialCredits,
      purchased: Math.max(0, totalBalance - trialCredits),
      trial_expires_at: user.trial_credits_expires_at,
    };
  }

  /**
   * Ajouter des crédits au compte utilisateur
   */
  async addCredits(
    userId: number,
    amount: number,
    transactionType: TransactionType,
    referenceId?: string,
    description?: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    return await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.credits_balance || user.credits || 0);
      const newBalance = currentBalance + amount;

      // Utiliser credits_balance directement (migration effectuée)
      await trx('users')
        .where({ id: userId })
        .update({ 
          credits_balance: newBalance,
          updated_at: trx.fn.now()
        });

      const [transaction] = await trx('credit_transactions')
        .insert({
          user_id: userId,
          amount,
          balance_after: newBalance,
          transaction_type: transactionType,
          reference_id: referenceId,
          status: 'completed',
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning('*');

      logger.info(`Credits added: user=${userId}, amount=${amount}, type=${transactionType}, new_balance=${newBalance}`);

      return transaction;
    });
  }

  /**
   * Déduire des crédits du compte utilisateur
   */
  async deductCredits(
    userId: number,
    amount: number,
    serviceType: ServiceType,
    referenceId?: string,
    description?: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    return await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.credits_balance || user.credits || 0);
      
      if (currentBalance < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${currentBalance}`);
      }

      const newBalance = currentBalance - amount;

      // Utiliser credits_balance directement (migration effectuée)
      await trx('users')
        .where({ id: userId })
        .update({ 
          credits_balance: newBalance,
          updated_at: trx.fn.now()
        });

      const [transaction] = await trx('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          balance_after: newBalance,
          transaction_type: 'usage',
          service_type: serviceType,
          reference_id: referenceId,
          status: 'completed',
          description,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning('*');

      logger.info(`Credits deducted: user=${userId}, amount=${amount}, service=${serviceType}, new_balance=${newBalance}`);

      return transaction;
    });
  }

  /**
   * Réserver des crédits (pour un job en cours)
   */
  async reserveCredits(
    userId: number,
    amount: number,
    serviceType: ServiceType,
    referenceId: string,
    description?: string
  ): Promise<CreditTransaction> {
    return await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.credits_balance || user.credits || 0);
      
      if (currentBalance < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${currentBalance}`);
      }

      const newBalance = currentBalance - amount;

      // Utiliser credits_balance directement (migration effectuée)
      await trx('users')
        .where({ id: userId })
        .update({ 
          credits_balance: newBalance,
          updated_at: trx.fn.now()
        });

      const [transaction] = await trx('credit_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          balance_after: newBalance,
          transaction_type: 'usage',
          service_type: serviceType,
          reference_id: referenceId,
          status: 'reserved',
          description: description || `Reserved for ${serviceType}`,
        })
        .returning('*');

      logger.info(`Credits reserved: user=${userId}, amount=${amount}, service=${serviceType}, ref=${referenceId}`);

      return transaction;
    });
  }

  /**
   * Confirmer une réservation de crédits
   */
  async confirmReservation(
    transactionId: number,
    actualAmount?: number
  ): Promise<void> {
    await db.transaction(async (trx) => {
      const transaction = await trx('credit_transactions')
        .where({ id: transactionId })
        .forUpdate()
        .first();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'reserved') {
        throw new Error('Transaction is not in reserved status');
      }

      if (actualAmount !== undefined && actualAmount !== Math.abs(transaction.amount)) {
        const difference = Math.abs(transaction.amount) - actualAmount;
        
        if (difference > 0) {
          await this.addCredits(
            transaction.user_id,
            difference,
            'refund',
            `refund_${transactionId}`,
            `Refund from transaction ${transactionId}`,
            { original_transaction_id: transactionId }
          );
        }

        await trx('credit_transactions')
          .where({ id: transactionId })
          .update({ 
            amount: -actualAmount,
            status: 'completed',
            updated_at: trx.fn.now()
          });
      } else {
        await trx('credit_transactions')
          .where({ id: transactionId })
          .update({ 
            status: 'completed',
            updated_at: trx.fn.now()
          });
      }

      logger.info(`Reservation confirmed: transaction=${transactionId}, actual_amount=${actualAmount}`);
    });
  }

  /**
   * Annuler une réservation et rembourser
   */
  async cancelReservation(transactionId: number): Promise<void> {
    await db.transaction(async (trx) => {
      const transaction = await trx('credit_transactions')
        .where({ id: transactionId })
        .forUpdate()
        .first();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'reserved') {
        throw new Error('Transaction is not in reserved status');
      }

      const refundAmount = Math.abs(transaction.amount);
      await this.addCredits(
        transaction.user_id,
        refundAmount,
        'refund',
        `cancel_${transactionId}`,
        `Cancelled reservation ${transactionId}`
      );

      await trx('credit_transactions')
        .where({ id: transactionId })
        .update({ 
          status: 'refunded',
          updated_at: trx.fn.now()
        });

      logger.info(`Reservation cancelled: transaction=${transactionId}, refunded=${refundAmount}`);
    });
  }

  /**
   * Accorder les crédits d'essai gratuits
   */
  async grantTrialCredits(userId: number, signupIp: string): Promise<void> {
    logger.info(`[TRIAL CREDITS] Starting grant process for user ${userId}, IP: ${signupIp}`);

    // Single atomic transaction: check eligibility + mark granted + add credits
    await db.transaction(async (trx) => {
      const user = await trx('users')
        .where({ id: userId })
        .forUpdate()
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      if (user.trial_credits_granted) {
        logger.warn(`[TRIAL CREDITS] Already granted for user ${userId}`);
        return;
      }

      // Vérifier si un autre utilisateur a déjà utilisé les crédits d'essai avec cette IP
      const isLocalIp = signupIp === '::1' || signupIp === '127.0.0.1' || signupIp === '::ffff:127.0.0.1' || signupIp === 'unknown';

      if (!isLocalIp) {
        const existingUserWithIp = await trx('users')
          .where({ signup_ip: signupIp })
          .where('trial_credits_granted', true)
          .whereNot('id', userId)
          .first();

        if (existingUserWithIp) {
          logger.warn(`[TRIAL CREDITS] Denied: duplicate IP ${signupIp} for user ${userId}`);
          throw new Error('Trial credits already used from this IP address');
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TRIAL_CREDITS.EXPIRATION_DAYS);

      const currentBalance = parseFloat(user.credits_balance || user.credits || 0);
      const newBalance = currentBalance + TRIAL_CREDITS.TOTAL;

      // Atomically: mark granted + update balance + record transaction
      await trx('users')
        .where({ id: userId })
        .update({
          trial_credits_granted: true,
          trial_credits_expires_at: expiresAt,
          signup_ip: signupIp,
          credits_balance: newBalance,
          updated_at: trx.fn.now(),
        });

      await trx('credit_transactions').insert({
        user_id: userId,
        amount: TRIAL_CREDITS.TOTAL,
        balance_after: newBalance,
        transaction_type: 'trial_grant',
        reference_id: `trial_${userId}`,
        status: 'completed',
        description: `Trial credits: ${TRIAL_CREDITS.FACEBOOK_POSTS}cr posts + ${TRIAL_CREDITS.FACEBOOK_PAGES}cr pages + ${TRIAL_CREDITS.MARKETPLACE}cr marketplace`,
        metadata: JSON.stringify({
          facebook_posts: TRIAL_CREDITS.FACEBOOK_POSTS,
          facebook_pages: TRIAL_CREDITS.FACEBOOK_PAGES,
          marketplace: TRIAL_CREDITS.MARKETPLACE,
          expires_at: expiresAt,
        }),
      });

      logger.info(`[TRIAL CREDITS] SUCCESS: user=${userId}, amount=${TRIAL_CREDITS.TOTAL}, balance=${newBalance}, expires=${expiresAt}`);
    });
  }

  /**
   * Obtenir l'historique des transactions
   */
  async getCreditHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const transactions = await db('credit_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('credit_transactions')
      .where({ user_id: userId })
      .count('* as count');

    return {
      transactions,
      total: parseInt(count as string, 10),
    };
  }

  /**
   * Calculer le coût d'une action
   * Utilise la matrice centralisée COST_MATRIX de costEstimationService
   */
  calculateCost(serviceType: ServiceType, itemCount: number): number {
    // Mapper vers les types supportés par calculateSimpleCost
    const mappedType = serviceType === 'facebook_posts' ? 'facebook_posts' :
                       serviceType === 'facebook_pages' || 
                       serviceType === 'facebook_pages_benchmark' ||
                       serviceType === 'facebook_pages_calendar' ||
                       serviceType === 'facebook_pages_copywriting' ? 'facebook_pages' :
                       'marketplace';
    
    return calculateSimpleCost(mappedType, itemCount);
  }

  /**
   * Vérifier si l'utilisateur a assez de crédits
   */
  async hasEnoughCredits(userId: number, requiredAmount: number): Promise<boolean> {
    const balance = await this.getUserCredits(userId);
    return balance >= requiredAmount;
  }

  /**
   * Expirer les crédits d'essai (tâche cron)
   */
  async expireTrialCredits(): Promise<number> {
    let expiredCount = 0;

    const usersWithExpiredTrials = await db('users')
      .where('trial_credits_granted', true)
      .where('trial_credits_expires_at', '<', new Date());

    for (const user of usersWithExpiredTrials) {
      try {
        const balance = await this.getUserCreditBalance(user.id);
        
        if (balance.trial > 0) {
          await this.deductCredits(
            user.id,
            balance.trial,
            'marketplace',
            `expire_trial_${user.id}`,
            `Trial credits expired`
          );
          
          expiredCount++;
          logger.info(`Expired trial credits for user ${user.id}: ${balance.trial} credits`);
        }
      } catch (error) {
        logger.error(`Failed to expire trial credits for user ${user.id}:`, error);
      }
    }

    return expiredCount;
  }
}

export const creditService = new CreditService();