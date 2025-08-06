import { HttpClient } from './http-client';
import { AuthService } from './auth-service';
import { Helpers } from '../utils/helpers';
import { Validators } from '../utils/validators';
import {
  MVolaConfig,
  TransactionRequest,
  TransactionInitiateResponse,
  TransactionDetailsResponse,
  TransactionStatusResponse,
  ApiResponse,
  WaitForCompletionOptions,
  WaitForCompletionResponse,
  MetadataItem,
  DebitCreditParty,
} from '../types';

export class MVolaAPI {
  private httpClient: HttpClient;
  private authService: AuthService;
  private partnerName: string;
  private partnerMSISDN: string;
  private defaultLanguage: 'FR' | 'MG';
  private callbackURL?: string;
  private accessToken: string;

  constructor(config: MVolaConfig) {
    const baseURL = config.sandbox 
      ? 'https://devapi.mvola.mg' 
      : 'https://api.mvola.mg';
    
    this.httpClient = new HttpClient(baseURL);
    this.authService = new AuthService(config);
    this.partnerName = config.partnerName;
    this.partnerMSISDN = config.partnerMSISDN;
    this.defaultLanguage = config.language || 'FR';
    this.callbackURL = config.callbackURL;
    this.accessToken = ''; // Initialiser à une chaîne vide

    // Validation de la configuration
    Validators.validatePartnerName(this.partnerName);
    if (!Validators.validateMSISDN(this.partnerMSISDN)) {
      throw new Error('Format MSISDN partenaire invalide');
    }
  }

  async authenticate(): Promise<void> {
    await this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const authResponse = await this.authService.getToken();
      this.accessToken = authResponse.access_token;
    } catch (error: any) {
      throw new Error('Échec de la génération du token: ' + error.message);
    }
  }

  private getDefaultHeaders(correlationId: string, language: 'FR' | 'MG'): Record<string, string> {
    if (!this.accessToken) {
      throw new Error('Token non configuré');
    }

    return {
      'Version': '1.0',
      'Authorization': `Bearer ${this.accessToken}`,
      'X-CorrelationID': correlationId,
      'UserLanguage': language,
      'UserAccountIdentifier': `msisdn;${this.partnerMSISDN}`,
      'partnerName': this.partnerName,
    };
  }

  async initiateTransaction(transactionData: TransactionRequest): Promise<ApiResponse<TransactionInitiateResponse>> {
    try {
      // Validation des données
      this.validateTransactionRequest(transactionData);

      const correlationId = Helpers.generateCorrelationId();
      const headers = this.getDefaultHeaders(
        correlationId, 
        transactionData.language || this.defaultLanguage
      );

      // Ajout de l'URL de callback si fournie
      if (this.callbackURL || transactionData.callbackURL) {
        headers['X-Callback-URL'] = transactionData.callbackURL || this.callbackURL!;
      }

      const requestBody = this.buildTransactionRequestBody(transactionData, correlationId);
      
      const response = await this.httpClient.post<TransactionInitiateResponse>(
        '/mvola/mm/transactions/type/merchantpay/1.0.0/',
        requestBody,
        headers
      );

      if (response.success) {
        response.correlationId = correlationId;
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: (error as Error).message,
      };
    }
  }

  async getTransactionDetails(transactionId: string, language?: 'FR' | 'MG'): Promise<ApiResponse<TransactionDetailsResponse>> {
    const correlationId = Helpers.generateCorrelationId();
    const headers = this.getDefaultHeaders(correlationId, language || this.defaultLanguage);

    const response = await this.httpClient.get<TransactionDetailsResponse>(
      `/mvola/mm/transactions/type/merchantpay/1.0.0/${transactionId}`,
      headers
    );

    if (response.success) {
      response.correlationId = correlationId;
    }

    return response;
  }

  async getTransactionStatus(serverCorrelationId: string, language?: 'FR' | 'MG'): Promise<ApiResponse<TransactionStatusResponse>> {
    const correlationId = Helpers.generateCorrelationId();
    const headers = this.getDefaultHeaders(correlationId, language || this.defaultLanguage);

    const response = await this.httpClient.get<TransactionStatusResponse>(
      `/mvola/mm/transactions/type/merchantpay/1.0.0/status/${serverCorrelationId}`,
      headers
    );

    if (response.success) {
      response.correlationId = correlationId;
    }

    return response;
  }
  /**
   * Attend la completion d'une transaction
   * @param serverCorrelationId 
   * @param options 
   * @returns 
   */
  async waitForTransactionCompletion(
    serverCorrelationId: string, 
    options: WaitForCompletionOptions = {}
  ): Promise<WaitForCompletionResponse> {
    const maxAttempts = options.maxAttempts || 10;
    const interval = options.interval || 5000;
    const language = options.language || this.defaultLanguage;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let statusResult = await this.getTransactionStatus(serverCorrelationId, language);
        
        if (!statusResult.success) {
          return statusResult;
        }

        let status = statusResult.data!.status;
        
        if (status === 'completed' || status === 'failed') {
          return {
            success: true,
            data: statusResult.data,
            attempts: attempt,
            correlationId: statusResult.correlationId,
          };
        }

        if (attempt < maxAttempts) {
          await Helpers.sleep(interval);
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          return {
            success: false,
            error: 'UNKNOWN_ERROR',
            message: (error as Error).message,
          };
        }
        await Helpers.sleep(interval);
      }
    }

    return {
      success: false,
      error: 'TIMEOUT',
      message: `Transaction toujours en cours après ${maxAttempts} tentatives`,
    };
  }

  private validateTransactionRequest(transactionData: TransactionRequest): void {
    if (!transactionData.amount || !transactionData.customerMSISDN || !transactionData.descriptionText) {
      throw new Error('Les champs amount, customerMSISDN et descriptionText sont obligatoires');
    }

    Validators.validateAmount(transactionData.amount);
    
    if (!Validators.validateMSISDN(transactionData.customerMSISDN)) {
      throw new Error('Format MSISDN client invalide');
    }

    Validators.validateDescription(transactionData.descriptionText);

    if (transactionData.clientTransactionId && transactionData.clientTransactionId.length > 50) {
      throw new Error('L\'ID de transaction client ne peut pas dépasser 50 caractères');
    }
  }

  private buildTransactionRequestBody(transactionData: TransactionRequest, correlationId: string): any {
    const debitParty: DebitCreditParty[] = [
      {
        key: 'msisdn',
        value: transactionData.customerMSISDN,
      },
    ];

    const creditParty: DebitCreditParty[] = [
      {
        key: 'msisdn',
        value: this.partnerMSISDN,
      },
    ];

    const metadata: MetadataItem[] = [
      {
        key: 'partnerName',
        value: this.partnerName,
      },
    ];

    // Ajout des métadonnées de devise étrangère si fournies
    if (transactionData.foreignCurrency && transactionData.foreignAmount) {
      metadata.push(
        {
          key: 'fc',
          value: transactionData.foreignCurrency,
        },
        {
          key: 'amountFc',
          value: transactionData.foreignAmount.toString(),
        }
      );
    }

    return {
      amount: transactionData.amount.toString(),
      currency: 'Ar',
      descriptionText: transactionData.descriptionText,
      requestDate: Helpers.formatDate(),
      debitParty,
      creditParty,
      metadata,
      requestingOrganisationTransactionReference: transactionData.clientTransactionId || correlationId,
      originalTransactionReference: transactionData.originalTransactionReference || '',
    };
  }
}