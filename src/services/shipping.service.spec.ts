import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { ShippingService } from './shipping.service';
import { AramexHttpService } from './aramex-http.service';
import { ShippingSearchDto } from '../dto/shipping-search.dto';
import { RateCalculationResponse } from '../interfaces/shipping.interface';
import { createMockClientInfo } from '../../test/test-utils';
import { ARAMEX_ENDPOINTS } from '../constants/endpoints';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockHttpService: jest.Mocked<AramexHttpService>;

  const createMockShippingSearchDto = (overrides = {}): ShippingSearchDto => ({
    origin: {
      country: 'US',
      city: 'New York',
      postalCode: '10001',
      state: 'NY',
      address: '123 Main St',
    },
    destination: {
      country: 'CA',
      city: 'Toronto',
      postalCode: 'M5V 3L9',
      state: 'ON',
      address: '456 Queen St',
    },
    packageDetails: {
      length: 20,
      width: 15,
      height: 10,
      weight: 2.5,
      unit: 'kg',
      dimensionUnit: 'cm',
    },
    serviceType: 'PDX',
    descriptionOfGoods: 'Electronics',
    ...overrides,
  });

  const createMockRateResponse = (hasErrors = false): RateCalculationResponse => ({
    hasErrors,
    errorMessage: hasErrors ? 'Test error' : undefined,
    rateDetails: hasErrors ? [] : [
      {
        serviceCode: 'PDX',
        serviceName: 'Priority Document Express',
        productType: 'PDX',
        productGroup: 'EXP',
        rate: 45.50,
        currencyCode: 'USD',
        estimatedDeliveryDate: '2024-01-20',
      },
      {
        serviceCode: 'PPX',
        serviceName: 'Priority Parcel Express',
        productType: 'PPX',
        productGroup: 'EXP',
        rate: 65.75,
        currencyCode: 'USD',
        estimatedDeliveryDate: '2024-01-19',
      },
    ],
  });

  beforeEach(async () => {
    const mockHttp = {
      post: jest.fn(),
      getClientInfo: jest.fn().mockReturnValue(createMockClientInfo()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: AramexHttpService,
          useValue: mockHttp,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    mockHttpService = module.get(AramexHttpService);

    // Mock logger
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRates', () => {
    it('should calculate shipping rates successfully', (done) => {
      const searchRequest = createMockShippingSearchDto();
      const mockResponse = createMockRateResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.services).toHaveLength(2);
          expect(response.services[0]).toMatchObject({
            serviceId: 'PDX',
            serviceName: 'Priority Document Express',
            serviceType: 'PDX',
            estimatedDeliveryTime: '2024-01-20',
            cost: {
              amount: 45.50,
              currency: 'USD',
            },
          });
          expect(response.message).toBe('Rate calculation successful');
          done();
        },
        error: done,
      });
    });

    it('should make HTTP call with correct payload structure', (done) => {
      const searchRequest = createMockShippingSearchDto();
      const mockResponse = createMockRateResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: () => {
          expect(mockHttpService.post).toHaveBeenCalledWith(
            ARAMEX_ENDPOINTS.SHIPPING.CALCULATE_RATE,
            {
              ClientInfo: expect.objectContaining({
                UserName: 'test_user',
                Password: 'test_password',
              }),
              Transaction: null,
              OriginAddress: {
                line1: '123 Main St',
                city: 'New York',
                stateOrProvinceCode: 'NY',
                postCode: '10001',
                countryCode: 'US',
              },
              DestinationAddress: {
                line1: '456 Queen St',
                city: 'Toronto',
                stateOrProvinceCode: 'ON',
                postCode: 'M5V 3L9',
                countryCode: 'CA',
              },
              ShipmentDetails: {
                dimensions: {
                  length: 20,
                  width: 15,
                  height: 10,
                  unit: 'cm',
                },
                actualWeight: {
                  value: 2.5,
                  unit: 'kg',
                },
                productGroup: 'EXP',
                productType: 'PDX',
                paymentType: 'P',
                numberOfPieces: 1,
                descriptionOfGoods: 'General Merchandise',
                goodsOriginCountry: 'US',
              },
            }
          );
          done();
        },
        error: done,
      });
    });

    it('should handle API errors', (done) => {
      const searchRequest = createMockShippingSearchDto();
      const mockResponse = createMockRateResponse(true);

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(false);
          expect(response.services).toHaveLength(0);
          expect(response.message).toBe('Test error');
          expect(response.errors).toEqual(['Test error']);
          done();
        },
        error: done,
      });
    });

    it('should handle HTTP service errors', (done) => {
      const searchRequest = createMockShippingSearchDto();

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      service.calculateRates(searchRequest).subscribe({
        next: () => done(new Error('Should have thrown error')),
        error: (error) => {
          expect(service['logger'].error).toHaveBeenCalledWith(
            'Failed to calculate shipping rates',
            expect.any(Error)
          );
          expect(error.message).toBe('Network error');
          done();
        },
      });
    });

    it('should use default values when optional fields are missing', (done) => {
      const minimalRequest: ShippingSearchDto = {
        origin: {
          country: 'US',
          city: 'New York',
        },
        destination: {
          country: 'CA',
          city: 'Toronto',
        },
        packageDetails: {
          length: 10,
          width: 8,
          height: 5,
          weight: 1,
        },
      };

      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(minimalRequest).subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];
          expect(callArgs.OriginAddress.line1).toBe('');
          expect(callArgs.ShipmentDetails.dimensions.unit).toBe('cm');
          expect(callArgs.ShipmentDetails.actualWeight.unit).toBe('kg');
          expect(callArgs.ShipmentDetails.productType).toBe('PDX');
          done();
        },
        error: done,
      });
    });
  });

  describe('searchShippingServices', () => {
    it('should be an alias for calculateRates', (done) => {
      const searchRequest = createMockShippingSearchDto();
      const mockResponse = createMockRateResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.searchShippingServices(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.services).toHaveLength(2);
          done();
        },
        error: done,
      });
    });
  });

  describe('getAvailableServices', () => {
    it('should parse origin and destination strings correctly', (done) => {
      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.getAvailableServices('New York,US', 'Toronto,CA').subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];
          expect(callArgs.OriginAddress.city).toBe('New York');
          expect(callArgs.OriginAddress.countryCode).toBe('US');
          expect(callArgs.DestinationAddress.city).toBe('Toronto');
          expect(callArgs.DestinationAddress.countryCode).toBe('CA');
          done();
        },
        error: done,
      });
    });

    it('should handle malformed location strings', (done) => {
      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.getAvailableServices('InvalidFormat', 'AlsoInvalid').subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];
          expect(callArgs.OriginAddress.city).toBe('InvalidFormat');
          expect(callArgs.OriginAddress.countryCode).toBe('');
          expect(callArgs.DestinationAddress.city).toBe('AlsoInvalid');
          expect(callArgs.DestinationAddress.countryCode).toBe('');
          done();
        },
        error: done,
      });
    });

    it('should use default package dimensions', (done) => {
      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.getAvailableServices('New York,US', 'Toronto,CA').subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];
          expect(callArgs.ShipmentDetails.dimensions).toEqual({
            length: 20,
            width: 15,
            height: 10,
            unit: 'cm',
          });
          expect(callArgs.ShipmentDetails.actualWeight).toEqual({
            value: 1,
            unit: 'kg',
          });
          done();
        },
        error: done,
      });
    });

    it('should handle locations with extra whitespace', (done) => {
      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.getAvailableServices(' New York , US ', ' Toronto , CA ').subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];
          expect(callArgs.OriginAddress.city).toBe('New York');
          expect(callArgs.OriginAddress.countryCode).toBe('US');
          expect(callArgs.DestinationAddress.city).toBe('Toronto');
          expect(callArgs.DestinationAddress.countryCode).toBe('CA');
          done();
        },
        error: done,
      });
    });
  });

  describe('calculateShippingCost', () => {
    it('should be an alias for calculateRates', (done) => {
      const searchRequest = createMockShippingSearchDto();
      const mockResponse = createMockRateResponse();

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateShippingCost(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.services).toHaveLength(2);
          done();
        },
        error: done,
      });
    });
  });

  describe('country code mapping', () => {
    it('should map common country names to codes', () => {
      const testCases = [
        { input: 'UAE', expected: 'AE' },
        { input: 'United Arab Emirates', expected: 'AE' },
        { input: 'US', expected: 'US' },
        { input: 'United States', expected: 'US' },
        { input: 'UK', expected: 'GB' },
        { input: 'United Kingdom', expected: 'GB' },
        { input: 'Jordan', expected: 'JO' },
        { input: 'Saudi Arabia', expected: 'SA' },
        { input: 'Kuwait', expected: 'KW' },
        { input: 'Qatar', expected: 'QA' },
        { input: 'Bahrain', expected: 'BH' },
        { input: 'Oman', expected: 'OM' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service['getCountryCode'](input);
        expect(result).toBe(expected);
      });
    });

    it('should return original value for unmapped countries', () => {
      const result = service['getCountryCode']('Unknown Country');
      expect(result).toBe('Unknown Country');
    });

    it('should handle empty string', () => {
      const result = service['getCountryCode']('');
      expect(result).toBe('');
    });
  });

  describe('request mapping', () => {
    it('should map complex shipping request correctly', () => {
      const searchRequest = createMockShippingSearchDto({
        serviceType: 'EXP',
        paymentType: 'C',
        descriptionOfGoods: 'Custom Electronics',
      });

      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: () => {
          const callArgs = mockHttpService.post.mock.calls[0][1];

          expect(callArgs.ShipmentDetails.productType).toBe('EXP');
          expect(callArgs.ShipmentDetails.productGroup).toBe('EXP');
          expect(callArgs.ShipmentDetails.paymentType).toBe('P'); // Always prepaid
          expect(callArgs.ShipmentDetails.descriptionOfGoods).toBe('General Merchandise');
          expect(callArgs.ShipmentDetails.numberOfPieces).toBe(1);
          expect(callArgs.ShipmentDetails.goodsOriginCountry).toBe('US');
        },
      });
    });
  });

  describe('response mapping', () => {
    it('should handle empty rate details', (done) => {
      const mockResponse: RateCalculationResponse = {
        hasErrors: false,
        rateDetails: [],
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(createMockShippingSearchDto()).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.services).toHaveLength(0);
          expect(response.message).toBe('Rate calculation successful');
          done();
        },
        error: done,
      });
    });

    it('should handle response without rate details', (done) => {
      const mockResponse: RateCalculationResponse = {
        hasErrors: false,
        rateDetails: undefined,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(createMockShippingSearchDto()).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.services).toHaveLength(0);
          done();
        },
        error: done,
      });
    });

    it('should handle error response without error message', (done) => {
      const mockResponse: RateCalculationResponse = {
        hasErrors: true,
        errorMessage: undefined,
        rateDetails: [],
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(createMockShippingSearchDto()).subscribe({
        next: (response) => {
          expect(response.success).toBe(false);
          expect(response.errors).toEqual(['Unknown error occurred']);
          done();
        },
        error: done,
      });
    });

    it('should map service description correctly', (done) => {
      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(createMockShippingSearchDto()).subscribe({
        next: (response) => {
          expect(response.services[0].description).toBe('EXP - Priority Document Express');
          expect(response.services[1].description).toBe('EXP - Priority Parcel Express');
          done();
        },
        error: done,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very large package dimensions', (done) => {
      const searchRequest = createMockShippingSearchDto({
        packageDetails: {
          length: 999.99,
          width: 999.99,
          height: 999.99,
          weight: 999.99,
        },
      });

      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        },
        error: done,
      });
    });

    it('should handle very small package dimensions', (done) => {
      const searchRequest = createMockShippingSearchDto({
        packageDetails: {
          length: 0.01,
          width: 0.01,
          height: 0.01,
          weight: 0.01,
        },
      });

      const mockResponse = createMockRateResponse();
      mockHttpService.post.mockReturnValue(of(mockResponse));

      service.calculateRates(searchRequest).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        },
        error: done,
      });
    });
  });
});