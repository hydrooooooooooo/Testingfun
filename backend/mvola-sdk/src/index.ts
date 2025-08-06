export * from './types';
export * from './services/mvola-api';
export * from './services/callback-parser';
export * from './utils/validators';
export * from './utils/helpers';
export * from './config/environment';

import { MVolaAPI } from './services/mvola-api';
import { getEnvironmentConfig, validateEnvironmentConfig } from './config/environment';
import { MVolaConfig } from './types';

export class MVolaMerchantPay extends MVolaAPI {
  constructor(config?: Partial<MVolaConfig>) {
    if (!config || Object.keys(config).length === 0) {
      // Utiliser les variables d'environnement
      const envConfig = getEnvironmentConfig();
      validateEnvironmentConfig(envConfig);
      
      const fullConfig: MVolaConfig = {
        sandbox: envConfig.MVOLA_SANDBOX || false,
        consumerKey: envConfig.MVOLA_CONSUMER_KEY!,
        consumerSecret: envConfig.MVOLA_CONSUMER_SECRET!,
        partnerName: envConfig.MVOLA_PARTNER_NAME!,
        partnerMSISDN: envConfig.MVOLA_PARTNER_MSISDN!,
        language: envConfig.MVOLA_LANGUAGE || 'FR',
        callbackURL: envConfig.MVOLA_CALLBACK_URL,
      };
      
      super(fullConfig);
    } else {
      // Mélanger config fournie avec variables d'environnement
      const envConfig = getEnvironmentConfig();
      const mergedConfig: MVolaConfig = {
        sandbox: config.sandbox ?? envConfig.MVOLA_SANDBOX ?? false,
        consumerKey: config.consumerKey || envConfig.MVOLA_CONSUMER_KEY!,
        consumerSecret: config.consumerSecret || envConfig.MVOLA_CONSUMER_SECRET!,
        partnerName: config.partnerName || envConfig.MVOLA_PARTNER_NAME!,
        partnerMSISDN: config.partnerMSISDN || envConfig.MVOLA_PARTNER_MSISDN!,
        language: config.language || envConfig.MVOLA_LANGUAGE || 'FR',
        callbackURL: config.callbackURL || envConfig.MVOLA_CALLBACK_URL,
      };
      
      super(mergedConfig);
    }
  }
}

export default MVolaMerchantPay;