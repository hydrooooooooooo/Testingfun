export interface MVolaConfig {
  sandbox?: boolean;
  consumerKey: string;
  consumerSecret: string;
  partnerName: string;
  partnerMSISDN: string;
  language?: 'FR' | 'MG';
  callbackURL?: string;
  accessToken?: string; // Maintenu pour la compatibilité
}

export interface TransactionRequest {
  amount: number;
  customerMSISDN: string;
  currency: 'Ar';
  descriptionText: string;
  clientTransactionId?: string;
  originalTransactionReference?: string;
  foreignCurrency?: string;
  foreignAmount?: number;
  language?: 'FR' | 'MG';
  callbackURL?: string;
}

export interface DebitCreditParty {
  key: 'msisdn';
  value: string;
}

export interface MetadataItem {
  key: string;
  value: string;
}

export interface FeeItem {
  feeAmount: string;
}

export interface TransactionInitiateResponse {
  status: 'pending';
  serverCorrelationId: string;
  notificationMethod: 'callback' | 'polling';
}

export interface TransactionDetailsResponse {
  amount: string;
  currency: 'Ar';
  transactionReference: string;
  transactionStatus: 'completed' | 'failed';
  createDate: string;
  debitParty: DebitCreditParty[];
  creditParty: DebitCreditParty[];
  metadata: MetadataItem[];
  fee?: {
    feeAmount: string;
  };
}

export interface TransactionStatusResponse {
  status: 'pending' | 'completed' | 'failed';
  serverCorrelationId: string;
  notificationMethod: 'polling' | 'callback';
  objectReference?: string;
}

export interface CallbackData {
  transactionStatus: 'completed' | 'failed';
  serverCorrelationId: string;
  transactionReference: string;
  requestDate: string;
  debitParty: DebitCreditParty[];
  creditParty: DebitCreditParty[];
  fees?: FeeItem[];
  metadata?: MetadataItem[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  details?: any;
  correlationId?: string;
}

export interface WaitForCompletionOptions {
  maxAttempts?: number;
  interval?: number;
  language?: 'FR' | 'MG';
}

export interface WaitForCompletionResponse extends ApiResponse {
  attempts?: number;
}

export interface ParsedCallback {
  transactionStatus: 'completed' | 'failed';
  serverCorrelationId: string;
  transactionReference: string;
  requestDate: string;
  debitParty: DebitCreditParty[];
  creditParty: DebitCreditParty[];
  fees: FeeItem[];
  metadata: MetadataItem[];
  isCompleted: boolean;
  isFailed: boolean;
}

export type ErrorCode = 
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED' 
  | 'REQUEST_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';