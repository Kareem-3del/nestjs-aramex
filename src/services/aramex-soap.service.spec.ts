import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as soap from 'soap';
import { AramexSoapService, AramexSoapException } from './aramex-soap.service';
import { ARAMEX_CONFIG_TOKEN } from '../aramex-config.module';
import {
  createMockAramexConfig,
  createMockSoapTrackingResponse,
  createMockTrackingResult,
  MockSoapClient,
} from '../../test/test-utils';

// Mock the soap module
jest.mock('soap');
const mockSoap = soap as jest.Mocked<typeof soap>;

describe('AramexSoapService', () => {
  let service: AramexSoapService;
  let mockSoapClient: MockSoapClient;

  beforeEach(async () => {
    mockSoapClient = new MockSoapClient();

    // Mock soap.createClient
    mockSoap.createClient.mockImplementation((wsdl, options, callback) => {
      // Simulate successful client creation
      callback(null, mockSoapClient as any);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AramexSoapService,
        {
          provide: ARAMEX_CONFIG_TOKEN,
          useValue: createMockAramexConfig({ debug: true }),
        },
      ],
    }).compile();

    service = module.get<AramexSoapService>(AramexSoapService);

    // Mock logger to avoid console output during tests
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize SOAP client successfully', async () => {
      await service.onModuleInit();

      expect(mockSoap.createClient).toHaveBeenCalled();
      expect(mockSoapClient.setEndpoint).toHaveBeenCalled();
      expect(mockSoapClient.addSoapHeader).toHaveBeenCalled();
      expect(service.isClientReady()).toBe(true);
    });

    it('should handle SOAP client creation error', async () => {
      const errorMessage = 'Failed to create SOAP client';
      mockSoap.createClient.mockImplementation((wsdl, options, callback) => {
        callback(new Error(errorMessage), null);
      });

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(service['logger'].error).toHaveBeenCalledWith(
        'Failed to initialize SOAP client',
        expect.any(Error)
      );
      expect(service.isClientReady()).toBe(false);
    });
  });

  describe('getClientInfo', () => {
    it('should return client info without exposing internal references', () => {
      const clientInfo = service.getClientInfo();

      expect(clientInfo).toEqual({
        UserName: 'test_user',
        Password: 'test_password',
        Version: 'v1.0',
        AccountNumber: '123456',
        AccountPin: '1234',
        AccountEntity: 'TEST',
        AccountCountryCode: 'US',
      });

      // Should return a copy, not the original reference
      clientInfo.UserName = 'modified';
      expect(service.getClientInfo().UserName).toBe('test_user');
    });
  });

  describe('trackShipments', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should track shipments successfully', (done) => {
      const trackingNumbers = ['123456789', '987654321'];
      const mockResponse = createMockSoapTrackingResponse({
        '123456789': [createMockTrackingResult()],
        '987654321': [createMockTrackingResult({ WaybillNumber: '987654321' })],
      });

      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      service.trackShipments(trackingNumbers, false).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(mockSoapClient.TrackShipments).toHaveBeenCalledWith(
            {
              ClientInfo: expect.objectContaining({
                UserName: 'test_user',
                Password: 'test_password',
              }),
              Transaction: {
                Reference1: expect.stringMatching(/^Track-\d+$/),
              },
              Shipments: trackingNumbers,
              GetLastTrackingUpdateOnly: false,
            },
            expect.any(Function)
          );
          done();
        },
        error: done,
      });
    });

    it('should track shipments with getLastTrackingUpdateOnly option', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockSoapTrackingResponse();

      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      service.trackShipments(trackingNumbers, true).subscribe({
        next: (response) => {
          expect(mockSoapClient.TrackShipments).toHaveBeenCalledWith(
            expect.objectContaining({
              GetLastTrackingUpdateOnly: true,
            }),
            expect.any(Function)
          );
          done();
        },
        error: done,
      });
    });

    it('should handle SOAP client not initialized', (done) => {
      service['client'] = null;

      service.trackShipments(['123456789']).subscribe({
        next: () => done(new Error('Should have thrown error')),
        error: (error) => {
          expect(error).toBeInstanceOf(AramexSoapException);
          expect(error.message).toBe('SOAP client not initialized');
          done();
        },
      });
    });

    it('should handle SOAP call errors', (done) => {
      const soapError = new Error('SOAP service unavailable');
      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        callback(soapError, null, 'raw response', null, 'raw request');
      });

      service.trackShipments(['123456789']).subscribe({
        next: () => done(new Error('Should have thrown error')),
        error: (error) => {
          expect(error).toBeInstanceOf(AramexSoapException);
          expect(error.message).toBe('SOAP call failed');
          expect(error.fault).toBe(soapError);
          expect(service['logger'].error).toHaveBeenCalledWith('SOAP Error:', soapError);
          done();
        },
      });
    });

    it('should log debug information when debug is enabled', (done) => {
      const trackingNumbers = ['123456789'];
      const mockResponse = createMockSoapTrackingResponse();

      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        callback(null, mockResponse, 'raw response');
      });

      service.trackShipments(trackingNumbers).subscribe({
        next: () => {
          expect(service['logger'].debug).toHaveBeenCalledWith(
            'SOAP Request:',
            expect.stringContaining('123456789')
          );
          expect(service['logger'].debug).toHaveBeenCalledWith(
            'SOAP Response:',
            expect.stringContaining('123456789')
          );
          expect(service['logger'].debug).toHaveBeenCalledWith(
            'Raw SOAP Response:',
            'raw response'
          );
          done();
        },
        error: done,
      });
    });

    it('should handle successful response with error details', (done) => {
      const mockResponse = createMockSoapTrackingResponse({}, true);
      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      service.trackShipments(['123456789']).subscribe({
        next: (response) => {
          expect(response.HasErrors).toBe(true);
          expect(response.Notifications).toHaveLength(1);
          done();
        },
        error: done,
      });
    });
  });

  describe('reinitializeClient', () => {
    it('should reinitialize SOAP client', async () => {
      await service.onModuleInit();
      expect(service.isClientReady()).toBe(true);

      // Clear the mock calls
      jest.clearAllMocks();

      await service.reinitializeClient();

      expect(service['client']).not.toBeNull();
      expect(mockSoap.createClient).toHaveBeenCalled();
    });

    it('should handle reinitialization errors', async () => {
      mockSoap.createClient.mockImplementation((wsdl, options, callback) => {
        callback(new Error('Reinitialization failed'), null);
      });

      await expect(service.reinitializeClient()).rejects.toThrow(AramexSoapException);
      expect(service.isClientReady()).toBe(false);
    });
  });

  describe('isClientReady', () => {
    it('should return true when client is initialized', async () => {
      await service.onModuleInit();
      expect(service.isClientReady()).toBe(true);
    });

    it('should return false when client is not initialized', () => {
      service['client'] = null;
      expect(service.isClientReady()).toBe(false);
    });
  });

  describe('AramexSoapException', () => {
    it('should create exception with message only', () => {
      const exception = new AramexSoapException('Test message');

      expect(exception.name).toBe('AramexSoapException');
      expect(exception.message).toBe('Test message');
      expect(exception.fault).toBeUndefined();
      expect(exception.response).toBeUndefined();
    });

    it('should create exception with fault and response', () => {
      const fault = new Error('SOAP fault');
      const response = { error: 'response error' };
      const exception = new AramexSoapException('Test message', fault, response);

      expect(exception.name).toBe('AramexSoapException');
      expect(exception.message).toBe('Test message');
      expect(exception.fault).toBe(fault);
      expect(exception.response).toBe(response);
    });
  });

  describe('integration scenarios', () => {
    it('should handle empty tracking numbers array', async () => {
      // Ensure client is initialized first
      await service.onModuleInit();

      const mockResponse = createMockSoapTrackingResponse({});
      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        expect(request.Shipments).toEqual([]);
        callback(null, mockResponse);
      });

      const result = await service.trackShipments([]).toPromise();
      expect(result).toEqual(mockResponse);
    });

    it('should handle large number of tracking numbers', async () => {
      // Ensure client is initialized first
      await service.onModuleInit();

      const trackingNumbers = Array.from({ length: 100 }, (_, i) => `TRACK${i.toString().padStart(6, '0')}`);
      const mockResponse = createMockSoapTrackingResponse({});

      mockSoapClient.TrackShipments.mockImplementation((request, callback) => {
        expect(request.Shipments).toHaveLength(100);
        callback(null, mockResponse);
      });

      const result = await service.trackShipments(trackingNumbers).toPromise();
      expect(result).toEqual(mockResponse);
    });
  });
});