import { CallbackParser } from '../src/services/callback-parser';
import { CallbackData } from '../src/types';

describe('CallbackParser', () => {
  const mockCallbackData: CallbackData = {
    transactionStatus: 'completed',
    serverCorrelationId: 'test-correlation-id',
    transactionReference: 'test-ref',
    requestDate: '2024-01-01T00:00:00.000Z',
    debitParty: [{ key: 'msisdn', value: '0340123456' }],
    creditParty: [{ key: 'msisdn', value: '0340987654' }],
    fees: [{ feeAmount: '50' }],
    metadata: [{ key: 'test', value: 'value' }],
  };

  it('should parse callback data correctly', () => {
    const result = CallbackParser.parseCallback(mockCallbackData);

    expect(result.transactionStatus).toBe('completed');
    expect(result.isCompleted).toBe(true);
    expect(result.isFailed).toBe(false);
    expect(result.fees).toHaveLength(1);
  });

  it('should parse JSON string callback', () => {
    const jsonString = JSON.stringify(mockCallbackData);
    const result = CallbackParser.parseCallback(jsonString);

    expect(result.transactionStatus).toBe('completed');
    expect(result.isCompleted).toBe(true);
  });

  it('should handle failed transaction status', () => {
    const failedCallback = { ...mockCallbackData, transactionStatus: 'failed' as const };
    const result = CallbackParser.parseCallback(failedCallback);

    expect(result.isCompleted).toBe(false);
    expect(result.isFailed).toBe(true);
  });

  it('should throw error for invalid JSON', () => {
    expect(() => CallbackParser.parseCallback('invalid json')).toThrow();
  });
});
