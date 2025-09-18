export interface ShippingAddress {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  stateOrProvinceCode?: string;
  postCode?: string;
  countryCode: string;
}

export interface ShippingDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ShippingWeight {
  value: number;
  unit: 'kg' | 'lb';
}

export interface ShippingDetails {
  dimensions?: ShippingDimensions;
  actualWeight: ShippingWeight;
  productGroup: 'EXP' | 'DOM';
  productType: string;
  paymentType: 'P' | 'C' | '3';
  paymentOptions?: string;
  services?: string;
  numberOfPieces: number;
  descriptionOfGoods: string;
  goodsOriginCountry: string;
}

export interface RateCalculationRequest {
  originAddress: ShippingAddress;
  destinationAddress: ShippingAddress;
  shipmentDetails: ShippingDetails;
}

export interface ShippingService {
  productGroup: string;
  productType: string;
  rate: number;
  currencyCode: string;
  serviceCode: string;
  serviceName: string;
  estimatedDeliveryDate: string;
}

export interface RateCalculationResponse {
  hasErrors: boolean;
  errorMessage?: string;
  totalAmount?: number;
  currencyCode?: string;
  estimatedDeliveryDate?: string;
  rateDetails?: ShippingService[];
}

// Legacy interfaces for backward compatibility
export interface ShippingLocation {
  country: string;
  city: string;
  postalCode?: string;
  state?: string;
  address?: string;
}

export interface ShippingSearchRequest {
  origin: ShippingLocation;
  destination: ShippingLocation;
  packageDetails: {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit?: 'kg' | 'lb';
    dimensionUnit?: 'cm' | 'in';
  };
  serviceType?: string;
  deliveryDate?: string;
}

export interface ShippingSearchResponse {
  success: boolean;
  services: {
    serviceId: string;
    serviceName: string;
    serviceType: string;
    estimatedDeliveryTime: string;
    cost: {
      amount: number;
      currency: string;
    };
    description?: string;
  }[];
  requestId?: string;
  message?: string;
  errors?: string[];
}