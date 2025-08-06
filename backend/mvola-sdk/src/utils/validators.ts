export class Validators {
  /**
   * Valide le format MSISDN
   */
  static validateMSISDN(msisdn: string): boolean {
    const cleanMsisdn = msisdn.replace(/\D/g, '');
    const msisdnRegex = /^[0-9]{10,15}$/;
    return msisdnRegex.test(cleanMsisdn);
  }

  /**
   * Valide la description selon les règles MVola
   */
  static validateDescription(description: string): void {
    if (description.length > 50) {
      throw new Error('La description ne peut pas dépasser 50 caractères');
    }
    
    const allowedPattern = /^[a-zA-Z0-9\s\-\._,]*$/;
    if (!allowedPattern.test(description)) {
      throw new Error('La description contient des caractères non autorisés. Seuls les caractères alphanumériques et "- . _ ," sont autorisés');
    }
  }

  /**
   * Valide le montant
   */
  static validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }
    
    if (!Number.isInteger(amount)) {
      throw new Error('Le montant doit être un nombre entier (pas de décimales)');
    }
  }

  /**
   * Valide le nom du partenaire
   */
  static validatePartnerName(partnerName: string): void {
    if (partnerName.length > 50) {
      throw new Error('Le nom du partenaire ne peut pas dépasser 50 caractères');
    }
    
    const allowedPattern = /^[a-zA-Z0-9\s\-\._,]*$/;
    if (!allowedPattern.test(partnerName)) {
      throw new Error('Le nom du partenaire contient des caractères non autorisés');
    }
  }
}