import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { AramexConfig } from '../interfaces/aramex-config.interface';
import { ARAMEX_CONFIG_TOKEN } from '../aramex-config.module';
import { ARAMEX_BASE_URLS } from '../constants/endpoints';
import { RateLimiterService } from './rate-limiter.service';

export class AramexHttpException extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: any,
  ) {
    super(message);
    this.name = 'AramexHttpException';
  }
}

@Injectable()
export class AramexHttpService {
  private readonly logger = new Logger(AramexHttpService.name);
  private readonly baseUrl: string;
  private readonly clientInfo: Record<string, any>;

  constructor(
    private readonly httpService: HttpService,
    @Inject(ARAMEX_CONFIG_TOKEN) private readonly config: AramexConfig,
    private readonly rateLimiter: RateLimiterService,
  ) {
    this.baseUrl = config.sandbox ? ARAMEX_BASE_URLS.SANDBOX : ARAMEX_BASE_URLS.PRODUCTION;
    this.clientInfo = {
      UserName: config.username,
      Password: config.password,
      Version: 'v2',
      AccountNumber: config.accountNumber,
      AccountPin: config.accountPin,
      AccountEntity: config.accountEntity,
      AccountCountryCode: config.accountCountryCode,
      Source: 24,
    };
  }

  private getBaseRequestConfig(): AxiosRequestConfig {
    return {
      baseURL: this.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  getClientInfo(): Record<string, any> {
    return this.clientInfo;
  }

  private handleError = (error: any) => {
    const statusCode = error.response?.status;
    const message = error.response?.data?.ErrorMessage || error.response?.data?.message || error.message || 'Unknown error occurred';

    if (this.config.debug) {
      this.logger.error('Aramex API Error:', {
        statusCode,
        message,
        data: error.response?.data,
        config: error.config,
      });
    }

    return throwError(() => new AramexHttpException(message, statusCode, error.response?.data));
  };

  get<T>(url: string, config?: AxiosRequestConfig): Observable<T> {
    const requestConfig = { ...this.getBaseRequestConfig(), ...config };

    if (this.config.debug) {
      this.logger.debug(`GET ${url}`, requestConfig);
    }

    return this.rateLimiter.executeWithRateLimit(() =>
      this.httpService.get<T>(url, requestConfig).pipe(
        timeout(this.config.timeout),
        map((response: AxiosResponse<T>) => response.data),
        catchError(this.handleError),
      )
    );
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Observable<T> {
    const requestConfig = { ...this.getBaseRequestConfig(), ...config };

    if (this.config.debug) {
      this.logger.debug(`POST ${url}`, { data, config: requestConfig });
    }

    return this.rateLimiter.executeWithRateLimit(() =>
      this.httpService.post<T>(url, data, requestConfig).pipe(
        timeout(this.config.timeout),
        map((response: AxiosResponse<T>) => response.data),
        catchError(this.handleError),
      )
    );
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Observable<T> {
    const requestConfig = { ...this.getBaseRequestConfig(), ...config };

    if (this.config.debug) {
      this.logger.debug(`PUT ${url}`, { data, config: requestConfig });
    }

    return this.httpService.put<T>(url, data, requestConfig).pipe(
      timeout(this.config.timeout),
      map((response: AxiosResponse<T>) => response.data),
      catchError(this.handleError),
    );
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Observable<T> {
    const requestConfig = { ...this.getBaseRequestConfig(), ...config };

    if (this.config.debug) {
      this.logger.debug(`DELETE ${url}`, requestConfig);
    }

    return this.httpService.delete<T>(url, requestConfig).pipe(
      timeout(this.config.timeout),
      map((response: AxiosResponse<T>) => response.data),
      catchError(this.handleError),
    );
  }
}