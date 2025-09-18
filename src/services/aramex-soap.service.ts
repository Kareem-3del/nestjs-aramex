import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as soap from 'soap';
import * as path from 'path';
import { AramexConfig } from '../interfaces/aramex-config.interface';
import { ARAMEX_CONFIG_TOKEN } from '../aramex-config.module';
import {
  ClientInfo,
  ShipmentTrackingRequest,
  ShipmentTrackingResponse
} from '../interfaces/tracking.interface';
import { ARAMEX_ENDPOINTS, ARAMEX_BASE_URLS } from '../constants/endpoints';

export class AramexSoapException extends Error {
  constructor(
    message: string,
    public readonly fault?: any,
    public readonly response?: any,
  ) {
    super(message);
    this.name = 'AramexSoapException';
  }
}

@Injectable()
export class AramexSoapService implements OnModuleInit {
  private readonly logger = new Logger(AramexSoapService.name);
  private client: soap.Client | null = null;
  private readonly wsdlUrl: string;
  private readonly clientInfo: ClientInfo;

  constructor(
    @Inject(ARAMEX_CONFIG_TOKEN) private readonly config: AramexConfig,
  ) {
    // Use local WSDL file path for better reliability
    this.wsdlUrl = path.join(__dirname, '../shipments-tracking-api-wsdl.wsdl');

    this.clientInfo = {
      UserName: config.username,
      Password: config.password,
      Version: 'v1.0',
      AccountNumber: config.accountNumber,
      AccountPin: config.accountPin,
      AccountEntity: config.accountEntity,
      AccountCountryCode: config.accountCountryCode,
    };
  }

  async onModuleInit() {
    try {
      await this.initializeSoapClient();
    } catch (error) {
      this.logger.error('Failed to initialize SOAP client', error);
    }
  }

  private async initializeSoapClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: soap.IOptions = {
        endpoint: ARAMEX_ENDPOINTS.TRACKING.TRACK_SHIPMENTS_SOAP,
        forceSoap12Headers: false,
      };

      soap.createClient(this.wsdlUrl, options, (err, client) => {
        if (err) {
          this.logger.error('Failed to create SOAP client', err);
          reject(new AramexSoapException('Failed to create SOAP client', err));
          return;
        }

        this.client = client;

        // Set the endpoint URL
        this.client.setEndpoint(ARAMEX_ENDPOINTS.TRACKING.TRACK_SHIPMENTS_SOAP);

        // Add SOAP headers if needed
        this.client.addSoapHeader({
          Action: ARAMEX_ENDPOINTS.TRACKING.SOAP_ACTION
        });

        if (this.config.debug) {
          this.logger.debug('SOAP client initialized successfully');
          this.logger.debug('WSDL methods:', Object.keys(this.client));
        }

        resolve();
      });
    });
  }

  getClientInfo(): ClientInfo {
    return { ...this.clientInfo };
  }

  trackShipments(
    shipmentNumbers: string[],
    getLastTrackingUpdateOnly: boolean = false
  ): Observable<ShipmentTrackingResponse> {
    if (!this.client) {
      return throwError(() => new AramexSoapException('SOAP client not initialized'));
    }

    const request: ShipmentTrackingRequest = {
      ClientInfo: this.getClientInfo(),
      Transaction: {
        Reference1: 'Track-' + Date.now(),
      },
      Shipments: shipmentNumbers,
      GetLastTrackingUpdateOnly: getLastTrackingUpdateOnly,
    };

    if (this.config.debug) {
      this.logger.debug('SOAP Request:', JSON.stringify(request, null, 2));
    }

    return from(
      new Promise<ShipmentTrackingResponse>((resolve, reject) => {
        this.client!.TrackShipments(request, (err: any, result: any, rawResponse: any, soapHeader: any, rawRequest: any) => {
          if (err) {
            this.logger.error('SOAP Error:', err);
            if (this.config.debug) {
              this.logger.debug('Raw SOAP Request:', rawRequest);
              this.logger.debug('Raw SOAP Response:', rawResponse);
            }
            reject(new AramexSoapException('SOAP call failed', err, rawResponse));
            return;
          }

          if (this.config.debug) {
            this.logger.debug('SOAP Response:', JSON.stringify(result, null, 2));
            this.logger.debug('Raw SOAP Response:', rawResponse);
          }

          resolve(result);
        });
      })
    ).pipe(
      catchError((error) => {
        this.logger.error('Failed to track shipments via SOAP', error);
        return throwError(() => error);
      })
    );
  }

  async reinitializeClient(): Promise<void> {
    this.client = null;
    await this.initializeSoapClient();
  }

  isClientReady(): boolean {
    return this.client !== null;
  }
}