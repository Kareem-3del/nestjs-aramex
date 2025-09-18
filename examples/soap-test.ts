import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  AramexSoapService,
  TrackingService,
  TrackingDto,
  BatchTrackingDto,
  TrackingResponse,
} from '../src';

/**
 * Example test class to demonstrate SOAP integration
 * This shows how to use the new SOAP-based tracking functionality
 */
@Injectable()
export class SoapIntegrationTest {
  private readonly logger = new Logger(SoapIntegrationTest.name);

  constructor(
    private readonly soapService: AramexSoapService,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * Test direct SOAP service call
   */
  async testDirectSoapCall(): Promise<void> {
    try {
      if (!this.soapService.isClientReady()) {
        this.logger.warn('SOAP client not ready, skipping test');
        return;
      }

      const trackingNumbers = ['47384974350'];

      this.logger.log('Testing direct SOAP call...');

      const response = await this.soapService.trackShipments(trackingNumbers, false).toPromise();

      this.logger.log('SOAP Response:', JSON.stringify(response, null, 2));

      if (response?.HasErrors) {
        this.logger.error('SOAP Error:', response.Notifications);
      } else {
        this.logger.log('SOAP Success - Tracking Results:', response?.TrackingResults);
      }
    } catch (error) {
      this.logger.error('SOAP Test Failed:', error);
    }
  }

  /**
   * Test tracking service with SOAP enabled
   */
  testTrackingServiceWithSoap(): Observable<TrackingResponse> {
    const trackingRequest: TrackingDto = {
      trackingNumber: '47384974350',
      useSoap: true,
      getLastTrackingUpdateOnly: false,
    };

    this.logger.log('Testing tracking service with SOAP...');

    return this.trackingService.trackPackage(trackingRequest).pipe(
      map((response) => {
        this.logger.log('Tracking Service Response:', {
          success: response.success,
          status: response.status,
          location: response.currentLocation,
          eventsCount: response.events.length,
        });
        return response;
      }),
      catchError((error) => {
        this.logger.error('Tracking Service Test Failed:', error);
        throw error;
      }),
    );
  }

  /**
   * Test batch tracking with SOAP
   */
  testBatchTrackingWithSoap(): Observable<TrackingResponse[]> {
    const batchRequest: BatchTrackingDto = {
      trackingNumbers: ['47384974350', '47384974351'],
      useSoap: true,
      getLastTrackingUpdateOnly: true,
    };

    this.logger.log('Testing batch tracking with SOAP...');

    return this.trackingService.trackBatch(batchRequest).pipe(
      map((responses) => {
        this.logger.log('Batch Tracking Results:');
        responses.forEach((response, index) => {
          this.logger.log(`- ${batchRequest.trackingNumbers[index]}: ${response.status} (${response.success ? 'Success' : 'Failed'})`);
        });
        return responses;
      }),
      catchError((error) => {
        this.logger.error('Batch Tracking Test Failed:', error);
        throw error;
      }),
    );
  }

  /**
   * Test fallback to HTTP when SOAP fails
   */
  testSoapFallbackToHttp(): Observable<TrackingResponse> {
    const trackingRequest: TrackingDto = {
      trackingNumber: '47384974350',
      useSoap: false, // Force HTTP fallback
    };

    this.logger.log('Testing HTTP fallback...');

    return this.trackingService.trackPackage(trackingRequest).pipe(
      map((response) => {
        this.logger.log('HTTP Fallback Response:', {
          success: response.success,
          status: response.status,
          method: 'HTTP REST',
        });
        return response;
      }),
      catchError((error) => {
        this.logger.error('HTTP Fallback Test Failed:', error);
        throw error;
      }),
    );
  }

  /**
   * Compare SOAP vs HTTP response times and data
   */
  async compareSOAPvsHTTP(trackingNumber: string): Promise<void> {
    this.logger.log('Comparing SOAP vs HTTP performance and data...');

    try {
      // Test SOAP
      const soapStart = Date.now();
      const soapResponse = await this.trackingService.trackPackage({
        trackingNumber,
        useSoap: true,
      }).toPromise();
      const soapTime = Date.now() - soapStart;

      // Test HTTP
      const httpStart = Date.now();
      const httpResponse = await this.trackingService.trackPackage({
        trackingNumber,
        useSoap: false,
      }).toPromise();
      const httpTime = Date.now() - httpStart;

      this.logger.log('Performance Comparison:', {
        soap: {
          time: `${soapTime}ms`,
          success: soapResponse?.success,
          eventsCount: soapResponse?.events.length || 0,
        },
        http: {
          time: `${httpTime}ms`,
          success: httpResponse?.success,
          eventsCount: httpResponse?.events.length || 0,
        },
      });

    } catch (error) {
      this.logger.error('Comparison test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    this.logger.log('Starting SOAP integration tests...');

    // Test 1: Direct SOAP call
    await this.testDirectSoapCall();

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Tracking service with SOAP
    try {
      await this.testTrackingServiceWithSoap().toPromise();
    } catch (error) {
      this.logger.error('Test 2 failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Batch tracking
    try {
      await this.testBatchTrackingWithSoap().toPromise();
    } catch (error) {
      this.logger.error('Test 3 failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: HTTP fallback
    try {
      await this.testSoapFallbackToHttp().toPromise();
    } catch (error) {
      this.logger.error('Test 4 failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Performance comparison
    await this.compareSOAPvsHTTP('47384974350');

    this.logger.log('All SOAP integration tests completed!');
  }
}