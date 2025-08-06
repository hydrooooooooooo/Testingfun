import { randomUUID } from 'crypto';

export class Helpers {
  /**
   * Génère un ID de corrélation unique
   */
  static generateCorrelationId(): string {
    return randomUUID();
  }

  /**
   * Formate la date au format requis par l'API MVola
   */
  static formatDate(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Nettoie un numéro MSISDN
   */
  static cleanMSISDN(msisdn: string): string {
    return msisdn.replace(/\D/g, '');
  }

  /**
   * Attendre un délai spécifié
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}