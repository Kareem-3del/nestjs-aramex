import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { TrackingService } from './tracking.service';
import { AramexHttpService } from './aramex-http.service';
import { AramexSoapService } from './aramex-soap.service';
import { CacheManagerService } from './cache-manager.service';
import {
  createMockSoapTrackingResponse,
  createMockTrackingResult,
  createMockHttpTrackingResponse,
  createMockClientInfo,
} from '../../test/test-utils';

describe('TrackingService', () => {
  let service: TrackingService;
  let mockHttpService: jest.Mocked<AramexHttpService>;
  let mockSoapService: jest.Mocked<AramexSoapService>;

  beforeEach(async () => {
    const mockHttp = {
      post: jest.fn(),
      getClientInfo: jest.fn().mockReturnValue(createMockClientInfo()),
    };

    const mockSoap = {
      isClientReady: jest.fn(),
      trackShipments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        CacheManagerService,
        {
          provide: AramexHttpService,
          useValue: mockHttp,
        },
        {
          provide: AramexSoapService,
          useValue: mockSoap,
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    mockHttpService = module.get(AramexHttpService);
    mockSoapService = module.get(AramexSoapService);

    // Mock logger
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackPackage', () => {
    it('should track package using SOAP by default', (done) => {
      const trackingNumber = '123456789';
      const mockResponse = createMockSoapTrackingResponse({
        [trackingNumber]: [createMockTrackingResult({ WaybillNumber: trackingNumber })],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackPackage({ trackingNumber }).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.trackingNumber).toBe(trackingNumber);
          expect(response.status).toBe('Out for Delivery');
          expect(response.currentLocation).toBe('New York, NY');
          expect(response.events).toHaveLength(1);
          expect(response.packageInfo?.service).toBe('Aramex');
          done();
        },
        error: done,
      });
    });

    it('should track package using HTTP when useSoap is false', (done) => {
      const trackingNumber = '123456789';
      const mockResponse = createMockHttpTrackingResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.trackPackage({ trackingNumber, useSoap: false }).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.trackingNumber).toBe(trackingNumber);
          expect(mockHttpService.post).toHaveBeenCalled();
          expect(mockSoapService.trackShipments).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should return empty response when package not found', (done) => {
      const trackingNumber = '999999999';
      const mockResponse = createMockSoapTrackingResponse({});

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackPackage({ trackingNumber }).subscribe({
        next: (response) => {
          expect(response.success).toBe(false);
          expect(response.trackingNumber).toBe(trackingNumber);
          expect(response.status).toBe('Not Found');
          expect(response.message).toBe('Tracking information not available');
          expect(response.errors).toEqual(['Package not found in system']);
          done();
        },
        error: done,
      });
    });
  });

  describe('trackMultiplePackages', () => {
    const trackingNumbers = ['123456789', '987654321'];

    it('should track multiple packages using SOAP', (done) => {
      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [createMockTrackingResult({ WaybillNumber: '123456789' })],
        '987654321': [createMockTrackingResult({ WaybillNumber: '987654321' })],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers, false).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(2);
          expect(responses[0].success).toBe(true);
          expect(responses[1].success).toBe(true);
          expect(mockSoapService.trackShipments).toHaveBeenCalledWith(trackingNumbers, false);
          done();
        },
        error: done,
      });
    });

    it('should fallback to HTTP when SOAP client not ready', (done) => {
      const mockResponse = createMockHttpTrackingResponse();
      mockResponse.shipments = [
        ...mockResponse.shipments,
        { ...mockResponse.shipments[0], trackingNumber: '987654321', shipmentNumber: '987654321' },
      ];

      mockSoapService.isClientReady.mockReturnValue(false);
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(service['logger'].warn).toHaveBeenCalledWith(
            'SOAP client not ready, falling back to HTTP service'
          );
          expect(responses).toHaveLength(2);
          expect(mockHttpService.post).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should fallback to HTTP when SOAP call fails', (done) => {
      const mockResponse = createMockHttpTrackingResponse();

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(
        throwError(() => new Error('SOAP service error'))
      );
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(service['logger'].error).toHaveBeenCalledWith(
            'Failed to track multiple packages via SOAP, falling back to HTTP',
            expect.any(Error)
          );
          expect(mockHttpService.post).toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should handle SOAP response with errors', (done) => {
      const mockResponse = createMockSoapTrackingResponse({}, true);

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(2);
          responses.forEach((response) => {
            expect(response.success).toBe(false);
            expect(response.status).toBe('Error');
            expect(response.message).toBe('ERROR001: Test error');
          });
          done();
        },
        error: done,
      });
    });
  });

  describe('trackBatch', () => {
    it('should track batch using SOAP by default', (done) => {
      const batchRequest = {
        trackingNumbers: ['123456789', '987654321'],
        getLastTrackingUpdateOnly: true,
      };

      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [createMockTrackingResult()],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackBatch(batchRequest).subscribe({
        next: (responses) => {
          expect(mockSoapService.trackShipments).toHaveBeenCalledWith(
            batchRequest.trackingNumbers,
            batchRequest.getLastTrackingUpdateOnly
          );
          done();
        },
        error: done,
      });
    });

    it('should track batch using HTTP when useSoap is false', (done) => {
      const batchRequest = {
        trackingNumbers: ['123456789'],
        useSoap: false,
      };

      const mockResponse = createMockHttpTrackingResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.trackBatch(batchRequest).subscribe({
        next: (responses) => {
          expect(mockHttpService.post).toHaveBeenCalled();
          expect(mockSoapService.trackShipments).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });
  });

  describe('getTrackingHistory', () => {
    it('should call trackPackage with tracking number', (done) => {
      const trackingNumber = '123456789';
      const mockResponse = createMockSoapTrackingResponse({
        [trackingNumber]: [createMockTrackingResult()],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.getTrackingHistory(trackingNumber).subscribe({
        next: (response) => {
          expect(response.trackingNumber).toBe(trackingNumber);
          expect(response.success).toBe(true);
          done();
        },
        error: done,
      });
    });
  });

  describe('getPackageStatus', () => {
    it('should return package status information', (done) => {
      const trackingNumber = '123456789';
      const mockResult = createMockTrackingResult({
        UpdateDateTime: '2024-01-15T10:30:00Z',
        UpdateDescription: 'Out for Delivery',
        UpdateLocation: 'New York, NY',
      });
      const mockResponse = createMockSoapTrackingResponse({
        [trackingNumber]: [mockResult],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.getPackageStatus(trackingNumber).subscribe({
        next: (status) => {
          expect(status.status).toBe('Out for Delivery');
          expect(status.location).toBe('New York, NY');
          expect(status.lastUpdate).toBe('2024-01-15T10:30:00Z');
          done();
        },
        error: done,
      });
    });

    it('should handle package status when no events exist', (done) => {
      const trackingNumber = '123456789';
      const mockResponse = createMockSoapTrackingResponse({});

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.getPackageStatus(trackingNumber).subscribe({
        next: (status) => {
          expect(status.status).toBe('Not Found');
          expect(status.location).toBeUndefined();
          expect(status.lastUpdate).toBeUndefined();
          done();
        },
        error: done,
      });
    });

    it('should handle errors when getting package status', (done) => {
      const trackingNumber = '123456789';

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(
        throwError(() => new Error('Service error'))
      );
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('HTTP fallback error'))
      );

      service.getPackageStatus(trackingNumber).subscribe({
        next: () => done(new Error('Should have thrown error')),
        error: (error) => {
          expect(service['logger'].error).toHaveBeenCalledWith(
            'Failed to get package status',
            expect.any(Error)
          );
          expect(error.message).toBe('HTTP fallback error');
          done();
        },
      });
    });
  });

  describe('HTTP tracking fallback', () => {
    it('should handle HTTP tracking response mapping', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockHttpTrackingResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service['trackMultiplePackagesHttp'](trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(true);
          expect(response.trackingNumber).toBe('123456789');
          expect(response.status).toBe('Out for Delivery');
          expect(response.currentLocation).toBe('New York, NY');
          expect(response.estimatedDelivery).toBe('2024-01-16');
          expect(response.events).toHaveLength(2);
          done();
        },
        error: done,
      });
    });

    it('should handle HTTP tracking errors', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockHttpTrackingResponse(true);

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service['trackMultiplePackagesHttp'](trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.status).toBe('Error');
          expect(response.message).toBe('Test HTTP error');
          done();
        },
        error: done,
      });
    });

    it('should handle HTTP service errors', (done) => {
      const trackingNumbers = ['123456789'];

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('HTTP service error'))
      );

      service['trackMultiplePackagesHttp'](trackingNumbers).subscribe({
        next: () => done(new Error('Should have thrown error')),
        error: (error) => {
          expect(service['logger'].error).toHaveBeenCalledWith(
            'Failed to track multiple packages via HTTP',
            expect.any(Error)
          );
          expect(error.message).toBe('HTTP service error');
          done();
        },
      });
    });

    it('should handle packages not found in HTTP response', (done) => {
      const trackingNumbers = ['999999999'];
      const mockResponse = createMockHttpTrackingResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service['trackMultiplePackagesHttp'](trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.trackingNumber).toBe('999999999');
          expect(response.status).toBe('Not Found');
          done();
        },
        error: done,
      });
    });
  });

  describe('SOAP response mapping', () => {
    it('should handle empty tracking results', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockSoapTrackingResponse({});

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.status).toBe('Not Found');
          done();
        },
        error: done,
      });
    });

    it('should sort tracking results by date descending', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResults = [
        createMockTrackingResult({
          UpdateDateTime: '2024-01-14T10:00:00Z',
          UpdateDescription: 'Package received',
        }),
        createMockTrackingResult({
          UpdateDateTime: '2024-01-15T15:00:00Z',
          UpdateDescription: 'Out for delivery',
        }),
        createMockTrackingResult({
          UpdateDateTime: '2024-01-15T09:00:00Z',
          UpdateDescription: 'In transit',
        }),
      ];

      const mockResponse = createMockSoapTrackingResponse({
        '123456789': mockResults,
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.status).toBe('Out for delivery'); // Latest status
          expect(response.events).toHaveLength(3);
          expect(response.events[0].description).toBe('Out for delivery'); // Latest first
          expect(response.events[1].description).toBe('In transit');
          expect(response.events[2].description).toBe('Package received'); // Oldest last
          done();
        },
        error: done,
      });
    });

    it('should handle SOAP response without notifications', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = {
        ...createMockSoapTrackingResponse({}, true),
        Notifications: undefined,
      };

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.message).toBe('Unknown SOAP error occurred');
          done();
        },
        error: done,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty tracking numbers array', (done) => {
      const mockResponse = createMockSoapTrackingResponse({});

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages([]).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(0);
          done();
        },
        error: done,
      });
    });

    it('should handle mixed results with some successful and some failed', (done) => {
      const trackingNumbers = ['123456789', '999999999'];
      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [createMockTrackingResult()],
        // '999999999' not included - simulates not found
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(2);
          expect(responses[0].success).toBe(true);
          expect(responses[0].trackingNumber).toBe('123456789');
          expect(responses[1].success).toBe(false);
          expect(responses[1].trackingNumber).toBe('999999999');
          done();
        },
        error: done,
      });
    });

    it('should use HTTP tracking when useSoap is false in trackPackage', (done) => {
      const trackingNumber = '123456789';
      const mockResponse = createMockHttpTrackingResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.trackPackage({ trackingNumber, useSoap: false }).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.trackingNumber).toBe(trackingNumber);
          expect(mockHttpService.post).toHaveBeenCalled();
          expect(mockSoapService.trackShipments).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('should handle empty tracking results array from SOAP service', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [], // Empty array instead of undefined
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.status).toBe('Not Found');
          expect(response.message).toBe('Tracking information not available');
          done();
        },
        error: done,
      });
    });

    it('should handle null tracking results from SOAP service', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockSoapTrackingResponse({
        '123456789': null, // Null instead of undefined
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(false);
          expect(response.status).toBe('Not Found');
          done();
        },
        error: done,
      });
    });

    it('should handle tracking result with minimal data', (done) => {
      const trackingNumbers = ['123456789'];
      const mockTrackingResult = createMockTrackingResult({
        WaybillNumber: '123456789',
        UpdateCode: 'SHP',
        UpdateDescription: 'Shipped',
        UpdateDateTime: '2024-01-15T10:30:00Z',
        UpdateLocation: 'New York, NY',
        Comments: 'Package shipped',
      });

      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [mockTrackingResult],
      });

      mockSoapService.isClientReady.mockReturnValue(true);
      mockSoapService.trackShipments.mockReturnValue(of(mockResponse));

      service.trackMultiplePackages(trackingNumbers).subscribe({
        next: (responses) => {
          expect(responses).toHaveLength(1);
          const response = responses[0];
          expect(response.success).toBe(true);
          expect(response.events).toHaveLength(1);
          done();
        },
        error: done,
      });
    });
  });
});