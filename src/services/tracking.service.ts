import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AramexHttpService } from './aramax-http.service';
import { AramexSoapService } from './aramex-soap.service';
import {
  TrackingRequest,
  TrackingResponse,
  AramexTrackingResponse,
  ShipmentTrackingResponse,
  TrackingResult
} from '../interfaces/tracking.interface';
import { TrackingDto, BatchTrackingDto } from '../dto/tracking.dto';
import { ARAMEX_ENDPOINTS } from '../constants/endpoints';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly httpService: AramexHttpService,
    private readonly soapService: AramexSoapService
  ) {}

  /**
   * Track a package using tracking number
   */
  trackPackage(trackingRequest: TrackingDto): Observable<TrackingResponse> {
    this.logger.debug('Tracking package', trackingRequest);

    if (trackingRequest.useSoap === false) {
      return this.trackMultiplePackagesHttp([trackingRequest.trackingNumber]).pipe(
        map((responses) => responses[0] || this.createEmptyTrackingResponse(trackingRequest.trackingNumber))
      );
    }

    return this.trackMultiplePackages([trackingRequest.trackingNumber]).pipe(
      map((responses) => responses[0] || this.createEmptyTrackingResponse(trackingRequest.trackingNumber))
    );
  }

  /**
   * Track multiple packages using SOAP API
   */
  trackMultiplePackages(trackingNumbers: string[], getLastTrackingUpdateOnly: boolean = false): Observable<TrackingResponse[]> {
    this.logger.debug('Tracking multiple packages via SOAP', { trackingNumbers, getLastTrackingUpdateOnly });

    if (!this.soapService.isClientReady()) {
      this.logger.warn('SOAP client not ready, falling back to HTTP service');
      return this.trackMultiplePackagesHttp(trackingNumbers);
    }

    return this.soapService.trackShipments(trackingNumbers, getLastTrackingUpdateOnly).pipe(
      map((response) => this.mapSoapTrackingResponse(response, trackingNumbers)),
      catchError((error) => {
        this.logger.error('Failed to track multiple packages via SOAP, falling back to HTTP', error);
        return this.trackMultiplePackagesHttp(trackingNumbers);
      }),
    );
  }

  /**
   * Track multiple packages with batch options
   */
  trackBatch(batchRequest: BatchTrackingDto): Observable<TrackingResponse[]> {
    this.logger.debug('Tracking batch', batchRequest);

    if (batchRequest.useSoap === false) {
      return this.trackMultiplePackagesHttp(batchRequest.trackingNumbers);
    }

    return this.trackMultiplePackages(batchRequest.trackingNumbers, batchRequest.getLastTrackingUpdateOnly);
  }

  /**
   * Track multiple packages using HTTP API (fallback)
   */
  private trackMultiplePackagesHttp(trackingNumbers: string[]): Observable<TrackingResponse[]> {
    this.logger.debug('Tracking multiple packages via HTTP', { trackingNumbers });

    const payload = {
      ClientInfo: this.httpService.getClientInfo(),
      Transaction: null,
      Shipments: trackingNumbers,
    };

    return this.httpService.post<any>(ARAMEX_ENDPOINTS.TRACKING.TRACK_SHIPMENTS, payload).pipe(
      map((response) => this.mapAramexTrackingResponse(response as AramexTrackingResponse, trackingNumbers)),
      catchError((error) => {
        this.logger.error('Failed to track multiple packages via HTTP', error);
        throw error;
      }),
    );
  }

  /**
   * Get tracking history for a package (legacy method - same as trackPackage)
   */
  getTrackingHistory(trackingNumber: string): Observable<TrackingResponse> {
    return this.trackPackage({ trackingNumber });
  }

  /**
   * Get current status of a package
   */
  getPackageStatus(trackingNumber: string): Observable<{ status: string; location?: string; lastUpdate?: string }> {
    this.logger.debug('Getting package status', { trackingNumber });

    return this.trackPackage({ trackingNumber }).pipe(
      map((response) => ({
        status: response.status || 'Unknown',
        location: response.currentLocation,
        lastUpdate: response.events.length > 0 ? response.events[0].timestamp : undefined,
      })),
      catchError((error) => {
        this.logger.error('Failed to get package status', error);
        throw error;
      }),
    );
  }

  private mapSoapTrackingResponse(response: ShipmentTrackingResponse, requestedTrackingNumbers: string[]): TrackingResponse[] {
    if (response.HasErrors) {
      const errorMessage = response.Notifications && response.Notifications.length > 0
        ? response.Notifications.map(n => `${n.Code}: ${n.Message}`).join(', ')
        : 'Unknown SOAP error occurred';

      return requestedTrackingNumbers.map(trackingNumber => ({
        success: false,
        trackingNumber,
        status: 'Error',
        events: [],
        message: errorMessage,
        errors: [errorMessage],
      }));
    }

    const results: TrackingResponse[] = [];

    requestedTrackingNumbers.forEach(trackingNumber => {
      const trackingResults = response.TrackingResults?.[trackingNumber] || [];

      if (trackingResults && trackingResults.length > 0) {
        // Sort by date descending to get latest update first
        const sortedResults = trackingResults.sort((a, b) =>
          new Date(b.UpdateDateTime).getTime() - new Date(a.UpdateDateTime).getTime()
        );

        const latestResult = sortedResults[0];

        results.push({
          success: true,
          trackingNumber,
          status: latestResult.UpdateDescription || latestResult.UpdateCode,
          currentLocation: latestResult.UpdateLocation,
          events: sortedResults.map(result => ({
            timestamp: result.UpdateDateTime,
            location: result.UpdateLocation,
            status: result.UpdateCode,
            description: result.UpdateDescription,
            eventCode: result.UpdateCode,
          })),
          packageInfo: {
            service: 'Aramex',
          },
        });
      } else {
        results.push(this.createEmptyTrackingResponse(trackingNumber));
      }
    });

    return results;
  }

  private mapAramexTrackingResponse(response: AramexTrackingResponse, requestedTrackingNumbers: string[]): TrackingResponse[] {
    if (response.hasErrors) {
      return requestedTrackingNumbers.map(trackingNumber => ({
        success: false,
        trackingNumber,
        status: 'Error',
        events: [],
        message: response.errorMessage,
        errors: response.errorMessage ? [response.errorMessage] : ['Unknown error occurred'],
      }));
    }

    const results: TrackingResponse[] = [];

    requestedTrackingNumbers.forEach(trackingNumber => {
      const shipment = response.shipments?.find(s =>
        s.trackingNumber === trackingNumber || s.shipmentNumber === trackingNumber
      );

      if (shipment) {
        results.push({
          success: true,
          trackingNumber,
          status: shipment.statusDescription || shipment.status,
          currentLocation: shipment.currentLocation,
          estimatedDelivery: shipment.estimatedDeliveryDate,
          events: (shipment.shipmentEvents || []).map(event => ({
            timestamp: event.eventDate,
            location: event.location,
            status: event.eventCode,
            description: event.eventDescription,
            eventCode: event.eventCode,
          })),
          packageInfo: {},
        });
      } else {
        results.push(this.createEmptyTrackingResponse(trackingNumber));
      }
    });

    return results;
  }

  private createEmptyTrackingResponse(trackingNumber: string): TrackingResponse {
    return {
      success: false,
      trackingNumber,
      status: 'Not Found',
      events: [],
      message: 'Tracking information not available',
      errors: ['Package not found in system'],
    };
  }
}