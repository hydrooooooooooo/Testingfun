import { CallbackData, ParsedCallback } from '../types';

export class CallbackParser {
  static parseCallback(callbackBody: string | CallbackData): ParsedCallback {
    try {
      const data: CallbackData = typeof callbackBody === 'string' 
        ? JSON.parse(callbackBody) 
        : callbackBody;
      
      return {
        transactionStatus: data.transactionStatus,
        serverCorrelationId: data.serverCorrelationId,
        transactionReference: data.transactionReference,
        requestDate: data.requestDate,
        debitParty: data.debitParty,
        creditParty: data.creditParty,
        fees: data.fees || [],
        metadata: data.metadata || [],
        isCompleted: data.transactionStatus === 'completed',
        isFailed: data.transactionStatus === 'failed',
      };
    } catch (error) {
      throw new Error(`Format de callback invalide: ${(error as Error).message}`);
    }
  }
}