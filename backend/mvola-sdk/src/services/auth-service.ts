import axios from 'axios';
import { MVolaConfig } from '../types';

export interface AuthResponse {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
}

export interface AuthError {
  ErrorCategory: string;
  ErrorCode: string;
  ErrorDescription: string;
  ErrorDateTime: string;
  ErrorParameters: Record<string, string>;
}

export class AuthService {
  private baseURL: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(config: MVolaConfig) {
    this.baseURL = config.sandbox 
      ? 'https://devapi.mvola.mg' 
      : 'https://api.mvola.mg';
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
  }

  private getAuthHeader(): string {
    const authString = `${this.consumerKey}:${this.consumerSecret}`;
    return Buffer.from(authString).toString('base64');
  }

  async getToken(): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${this.baseURL}/token`,
        new URLSearchParams({
          'grant_type': 'client_credentials',
          'scope': 'EXT_INT_MVOLA_SCOPE'
        }),
        {
          headers: {
            'Authorization': `Basic ${this.getAuthHeader()}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error('Failed to get token');
      }
      return response.data;
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response?.data) {
        throw new Error(JSON.stringify(axiosError.response.data));
      }
      throw error;
    }
  }
}
