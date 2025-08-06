import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ErrorCode } from '../types';

export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }

  async get<T>(url: string, headers: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, { headers });
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async post<T>(url: string, data: any, headers: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, { headers });
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  private handleError(error: AxiosError): ApiResponse {
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;

      let errorMessage = 'Erreur API MVola';
      let errorCode: ErrorCode = 'UNKNOWN_ERROR';

      switch (statusCode) {
        case 400:
          errorMessage = 'Requête invalide - paramètre manquant ou incorrect';
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          errorMessage = 'Token d\'accès invalide';
          errorCode = 'UNAUTHORIZED';
          break;
        case 402:
          errorMessage = 'Échec de la requête - paramètres valides mais requête échouée';
          errorCode = 'REQUEST_FAILED';
          break;
        case 403:
          errorMessage = 'Token d\'accès sans permissions suffisantes';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          errorCode = 'NOT_FOUND';
          break;
        case 409:
          errorMessage = 'Conflit - requête en conflit avec une autre requête';
          errorCode = 'CONFLICT';
          break;
        case 429:
          errorMessage = 'Trop de requêtes - veuillez réessayer plus tard';
          errorCode = 'RATE_LIMITED';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Erreur serveur MVola';
          errorCode = 'SERVER_ERROR';
          break;
      }

      return {
        success: false,
        error: errorCode,
        message: errorMessage,
        statusCode,
        details: errorData,
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Erreur de connexion au serveur MVola',
        details: error.message,
      };
    } else {
      return {
        success: false,
        error: 'UNKNOWN_ERROR',
        message: error.message || 'Erreur inconnue',
        details: error,
      };
    }
  }
}