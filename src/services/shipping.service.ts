import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AramexHttpService } from './aramax-http.service';
import {
  ShippingSearchRequest,
  ShippingSearchResponse,
  RateCalculationRequest,
  RateCalculationResponse,
  ShippingAddress,
  ShippingDetails
} from '../interfaces/shipping.interface';
import { ShippingSearchDto } from '../dto/shipping-search.dto';
import { ARAMEX_ENDPOINTS } from '../constants/endpoints';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly httpService: AramexHttpService) {}

  /**
   * Calculate shipping rates using Aramex API
   */
  calculateRates(searchRequest: ShippingSearchDto): Observable<ShippingSearchResponse> {
    this.logger.debug('Calculating shipping rates', searchRequest);

    const aramexRequest: RateCalculationRequest = this.mapToAramexRequest(searchRequest);

    const payload = {
      ClientInfo: this.httpService.getClientInfo(),
      Transaction: null,
      OriginAddress: aramexRequest.originAddress,
      DestinationAddress: aramexRequest.destinationAddress,
      ShipmentDetails: aramexRequest.shipmentDetails,
    };

    return this.httpService.post<RateCalculationResponse>(ARAMEX_ENDPOINTS.SHIPPING.CALCULATE_RATE, payload).pipe(
      map((response) => this.mapAramexRateResponse(response)),
      catchError((error) => {
        this.logger.error('Failed to calculate shipping rates', error);
        throw error;
      }),
    );
  }

  /**
   * Search for available shipping services (legacy method)
   */
  searchShippingServices(searchRequest: ShippingSearchDto): Observable<ShippingSearchResponse> {
    return this.calculateRates(searchRequest);
  }

  /**
   * Get available shipping services for a route
   */
  getAvailableServices(
    origin: string,
    destination: string,
  ): Observable<ShippingSearchResponse> {
    this.logger.debug('Getting available services', { origin, destination });

    // Parse origin and destination strings (format: "City,CountryCode")
    const [originCity, originCountry] = origin.split(',');
    const [destCity, destCountry] = destination.split(',');

    const searchRequest: ShippingSearchDto = {
      origin: {
        city: originCity?.trim() || '',
        country: originCountry?.trim() || '',
      },
      destination: {
        city: destCity?.trim() || '',
        country: destCountry?.trim() || '',
      },
      packageDetails: {
        length: 20,
        width: 15,
        height: 10,
        weight: 1,
        unit: 'kg',
        dimensionUnit: 'cm',
      },
    };

    return this.calculateRates(searchRequest);
  }

  /**
   * Calculate shipping cost (legacy method)
   */
  calculateShippingCost(searchRequest: ShippingSearchDto): Observable<ShippingSearchResponse> {
    return this.calculateRates(searchRequest);
  }

  private mapToAramexRequest(searchRequest: ShippingSearchDto): RateCalculationRequest {
    const originAddress: ShippingAddress = {
      line1: searchRequest.origin.address || '',
      city: searchRequest.origin.city,
      stateOrProvinceCode: searchRequest.origin.state,
      postCode: searchRequest.origin.postalCode,
      countryCode: this.getCountryCode(searchRequest.origin.country),
    };

    const destinationAddress: ShippingAddress = {
      line1: searchRequest.destination.address || '',
      city: searchRequest.destination.city,
      stateOrProvinceCode: searchRequest.destination.state,
      postCode: searchRequest.destination.postalCode,
      countryCode: this.getCountryCode(searchRequest.destination.country),
    };

    const shipmentDetails: ShippingDetails = {
      dimensions: {
        length: searchRequest.packageDetails.length,
        width: searchRequest.packageDetails.width,
        height: searchRequest.packageDetails.height,
        unit: searchRequest.packageDetails.dimensionUnit || 'cm',
      },
      actualWeight: {
        value: searchRequest.packageDetails.weight,
        unit: searchRequest.packageDetails.unit || 'kg',
      },
      productGroup: 'EXP', // Default to Express
      productType: searchRequest.serviceType || 'PDX',
      paymentType: 'P', // Prepaid
      numberOfPieces: 1,
      descriptionOfGoods: 'General Merchandise',
      goodsOriginCountry: originAddress.countryCode,
    };

    return {
      originAddress,
      destinationAddress,
      shipmentDetails,
    };
  }

  private mapAramexRateResponse(response: RateCalculationResponse): ShippingSearchResponse {
    if (response.hasErrors) {
      return {
        success: false,
        services: [],
        message: response.errorMessage,
        errors: response.errorMessage ? [response.errorMessage] : ['Unknown error occurred'],
      };
    }

    const services = (response.rateDetails || []).map(rate => ({
      serviceId: rate.serviceCode,
      serviceName: rate.serviceName,
      serviceType: rate.productType,
      estimatedDeliveryTime: rate.estimatedDeliveryDate,
      cost: {
        amount: rate.rate,
        currency: rate.currencyCode,
      },
      description: `${rate.productGroup} - ${rate.serviceName}`,
    }));

    return {
      success: true,
      services,
      requestId: undefined,
      message: 'Rate calculation successful',
    };
  }

  private getCountryCode(country: string): string {
    // Simple country code mapping - in real implementation, use a comprehensive mapping
    const countryMap: Record<string, string> = {
      'UAE': 'AE',
      'United Arab Emirates': 'AE',
      'US': 'US',
      'United States': 'US',
      'UK': 'GB',
      'United Kingdom': 'GB',
      'Jordan': 'JO',
      'Saudi Arabia': 'SA',
      'Kuwait': 'KW',
      'Qatar': 'QA',
      'Bahrain': 'BH',
      'Oman': 'OM',
    };

    return countryMap[country] || country;
  }
}