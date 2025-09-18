import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ShippingService,
  TrackingService,
  ShippingSearchDto,
  TrackingDto,
  BatchTrackingDto,
  ShippingSearchResponse,
  TrackingResponse,
} from '../src';

@Injectable()
export class AramexUsageExamples {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * Example: Search for shipping services
   */
  searchShippingExample(): Observable<ShippingSearchResponse> {
    const searchRequest: ShippingSearchDto = {
      origin: {
        country: 'AE',
        city: 'Dubai',
        postalCode: '12345',
      },
      destination: {
        country: 'US',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      },
      packageDetails: {
        length: 20,
        width: 15,
        height: 10,
        weight: 2.5,
        unit: 'kg',
        dimensionUnit: 'cm',
      },
      serviceType: 'PDX', // Aramex Express service
    };

    return this.shippingService.calculateRates(searchRequest).pipe(
      map((response) => {
        console.log('Available shipping services:', response.services);
        return response;
      }),
      catchError((error) => {
        console.error('Shipping rate calculation failed:', error);
        throw error;
      }),
    );
  }

  /**
   * Example: Calculate shipping cost
   */
  calculateCostExample(): Observable<ShippingSearchResponse> {
    const searchRequest: ShippingSearchDto = {
      origin: {
        country: 'AE',
        city: 'Abu Dhabi',
      },
      destination: {
        country: 'GB',
        city: 'London',
      },
      packageDetails: {
        length: 30,
        width: 20,
        height: 15,
        weight: 5.0,
        unit: 'kg',
        dimensionUnit: 'cm',
      },
    };

    return this.shippingService.calculateRates(searchRequest).pipe(
      map((response) => {
        console.log('Shipping costs:', response.services.map(s => ({
          service: s.serviceName,
          cost: s.cost,
          delivery: s.estimatedDeliveryTime,
        })));
        return response;
      }),
    );
  }

  /**
   * Example: Track a standard package using SOAP API
   */
  trackPackageExample(): Observable<TrackingResponse> {
    const trackingRequest: TrackingDto = {
      trackingNumber: '47384974350',
      useSoap: true, // Use SOAP API for enhanced tracking data
    };

    return this.trackingService.trackPackage(trackingRequest).pipe(
      map((response) => {
        console.log('Package status:', response.status);
        console.log('Current location:', response.currentLocation);
        console.log('Tracking events:', response.events);
        return response;
      }),
    );
  }

  /**
   * Example: Track a package using REST API (fallback)
   */
  trackPackageRestExample(): Observable<TrackingResponse> {
    const trackingRequest: TrackingDto = {
      trackingNumber: '47384974350',
      useSoap: false, // Force use of REST API
    };

    return this.trackingService.trackPackage(trackingRequest).pipe(
      map((response) => {
        console.log('Package status (REST):', response.status);
        console.log('Current location (REST):', response.currentLocation);
        return response;
      }),
    );
  }

  /**
   * Example: Track with latest update only (SOAP)
   */
  trackPackageLatestOnlyExample(): Observable<TrackingResponse> {
    const trackingRequest: TrackingDto = {
      trackingNumber: '47384974350',
      useSoap: true,
      getLastTrackingUpdateOnly: true, // Get only the latest tracking update
    };

    return this.trackingService.trackPackage(trackingRequest).pipe(
      map((response) => {
        console.log('Latest status only:', response.status);
        console.log('Latest location:', response.currentLocation);
        console.log('Event count:', response.events.length);
        return response;
      }),
    );
  }


  /**
   * Example: Track multiple packages using SOAP API
   */
  trackMultiplePackagesExample(): Observable<TrackingResponse[]> {
    const trackingNumbers = ['47384974350', '47384974351', '47384974352'];

    return this.trackingService.trackMultiplePackages(trackingNumbers, false).pipe(
      map((responses) => {
        responses.forEach((response, index) => {
          console.log(`Package ${trackingNumbers[index]}:`, {
            status: response.status,
            location: response.currentLocation,
            eventsCount: response.events.length,
          });
        });
        return responses;
      }),
    );
  }

  /**
   * Example: Track multiple packages using batch DTO
   */
  trackBatchExample(): Observable<TrackingResponse[]> {
    const batchRequest: BatchTrackingDto = {
      trackingNumbers: ['47384974350', '47384974351', '47384974352'],
      useSoap: true,
      getLastTrackingUpdateOnly: false,
    };

    return this.trackingService.trackBatch(batchRequest).pipe(
      map((responses) => {
        console.log('Batch tracking results:');
        responses.forEach((response, index) => {
          console.log(`- ${batchRequest.trackingNumbers[index]}: ${response.status}`);
        });
        return responses;
      }),
    );
  }

  /**
   * Example: Track multiple packages with latest updates only (SOAP)
   */
  trackMultipleLatestOnlyExample(): Observable<TrackingResponse[]> {
    const batchRequest: BatchTrackingDto = {
      trackingNumbers: ['47384974350', '47384974351'],
      useSoap: true,
      getLastTrackingUpdateOnly: true, // Only get latest updates for faster response
    };

    return this.trackingService.trackBatch(batchRequest).pipe(
      map((responses) => {
        console.log('Latest updates only:');
        responses.forEach((response, index) => {
          console.log(`- ${batchRequest.trackingNumbers[index]}:`);
          console.log(`  Status: ${response.status}`);
          console.log(`  Location: ${response.currentLocation}`);
          console.log(`  Events: ${response.events.length}`);
        });
        return responses;
      }),
    );
  }

  /**
   * Example: Get available services for a route
   */
  getAvailableServicesExample(): Observable<ShippingSearchResponse> {
    return this.shippingService.getAvailableServices('Dubai,AE', 'London,GB').pipe(
      map((response) => {
        console.log('Available services between Dubai and London:');
        response.services.forEach((service) => {
          console.log(`- ${service.serviceName}: ${service.cost.amount} ${service.cost.currency}`);
        });
        return response;
      }),
    );
  }

  /**
   * Example: Get package status only
   */
  getPackageStatusExample(): Observable<{ status: string; location?: string; lastUpdate?: string }> {
    return this.trackingService.getPackageStatus('47384974350').pipe(
      map((status) => {
        console.log('Quick status check:', status);
        return status;
      }),
    );
  }

  /**
   * Example: Get full tracking history
   */
  getTrackingHistoryExample(): Observable<TrackingResponse> {
    return this.trackingService.getTrackingHistory('47384974350').pipe(
      map((response) => {
        console.log('Full tracking history:');
        response.events.forEach((event, index) => {
          console.log(`${index + 1}. ${event.timestamp}: ${event.description}`);
          console.log(`   Location: ${event.location}`);
          console.log(`   Status: ${event.status}`);
        });
        return response;
      }),
    );
  }
}