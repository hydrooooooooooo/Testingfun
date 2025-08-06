import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  MVOLA_SANDBOX: boolean;
  MVOLA_CONSUMER_KEY: string;
  MVOLA_CONSUMER_SECRET: string;
  MVOLA_PARTNER_NAME: string;
  MVOLA_PARTNER_MSISDN: string;
  MVOLA_LANGUAGE: 'FR' | 'MG';
  MVOLA_CALLBACK_URL?: string;
  MVOLA_ACCESS_TOKEN?: string; // Maintenu pour la compatibilité
}

export const getEnvironmentConfig = (): Partial<EnvironmentConfig> => {
  return {
    MVOLA_SANDBOX: process.env.MVOLA_SANDBOX === 'true',
    MVOLA_CONSUMER_KEY: process.env.MVOLA_CONSUMER_KEY,
    MVOLA_CONSUMER_SECRET: process.env.MVOLA_CONSUMER_SECRET,
    MVOLA_PARTNER_NAME: process.env.MVOLA_PARTNER_NAME,
    MVOLA_PARTNER_MSISDN: process.env.MVOLA_PARTNER_MSISDN,
    MVOLA_LANGUAGE: (process.env.MVOLA_LANGUAGE as 'FR' | 'MG') || 'FR',
    MVOLA_CALLBACK_URL: process.env.MVOLA_CALLBACK_URL,
  };
};

export const validateEnvironmentConfig = (config: Partial<EnvironmentConfig>): void => {
  const required = ['MVOLA_CONSUMER_KEY', 'MVOLA_CONSUMER_SECRET', 'MVOLA_PARTNER_NAME', 'MVOLA_PARTNER_MSISDN'];
  
  for (const key of required) {
    if (!config[key as keyof EnvironmentConfig]) {
      throw new Error(`Variable d'environnement manquante: ${key}`);
    }
  }
};