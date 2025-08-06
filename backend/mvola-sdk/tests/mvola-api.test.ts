import { MVolaAPI } from '../src/services/mvola-api';
import { HttpClient } from '../src/services/http-client';
import { AuthService } from '../src/services/auth-service';
import { MVolaConfig } from '../src/types';

// Mock HttpClient
jest.mock('../src/services/http-client');
jest.mock('../src/services/auth-service');
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('MVolaAPI', () => {
  let mvolaAPI: MVolaAPI;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockAuthService: jest.Mocked<AuthService>;

  const mockConfig: MVolaConfig = {
    sandbox: true,
    partnerName: 'Test Partner',
    partnerMSISDN: '0340123456',
    language: 'FR',
    consumerKey: 'test-consumer-key',
    consumerSecret: 'test-consumer-secret',
  };

  beforeEach(async () => {
    MockedHttpClient.mockClear();
    MockedAuthService.mockClear();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;
    // Simuler l'implémentation du token
    mockAuthService = {
      getToken: jest.fn().mockResolvedValue({
        access_token: 'mocked-token',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    } as any;
    
    MockedHttpClient.mockImplementation(() => mockHttpClient);
    MockedAuthService.mockImplementation(() => mockAuthService);
    mvolaAPI = new MVolaAPI(mockConfig);
    await mvolaAPI.authenticate();
  });

  describe('initiateTransaction', () => {
    it('should initiate transaction successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'pending',
          serverCorrelationId: 'test-correlation-id',
          notificationMethod: 'polling',
        },
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await mvolaAPI.initiateTransaction({
        amount: 1000,
        customerMSISDN: '0340987654',
        currency: 'Ar',
        descriptionText: 'Test payment',
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('pending');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('should validate transaction data', async () => {
      const result = await mvolaAPI.initiateTransaction({
        amount: -100, // Invalid amount
        customerMSISDN: '0340987654',
        currency: 'Ar',
        descriptionText: 'Test payment',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'completed',
          serverCorrelationId: 'test-correlation-id',
          notificationMethod: 'polling',
        },
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await mvolaAPI.getTransactionStatus('test-correlation-id');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });
});