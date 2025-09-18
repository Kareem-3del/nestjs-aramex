// Main module
export { AramexModule } from './aramex.module';
export { AramexConfigModule } from './aramex-config.module';

// Services
export { AramexHttpService, AramexHttpException } from './services/aramex-http.service';
export { AramexSoapService, AramexSoapException } from './services/aramex-soap.service';
export { ShippingService } from './services/shipping.service';
export { TrackingService } from './services/tracking.service';

// Interfaces
export { AramexConfig } from './interfaces/aramex-config.interface';
export {
  ShippingLocation,
  ShippingAddress,
  ShippingDimensions,
  ShippingWeight,
  ShippingDetails,
  ShippingService as IShippingService,
  ShippingSearchRequest,
  ShippingSearchResponse,
  RateCalculationRequest,
  RateCalculationResponse,
} from './interfaces/shipping.interface';
export {
  TrackingEvent,
  TrackingShipment,
  TrackingRequest,
  TrackingResponse,
  AramexTrackingResponse,
  ClientInfo,
  Transaction,
  Notification,
  TrackingResult,
  ShipmentTrackingRequest,
  ShipmentTrackingResponse,
} from './interfaces/tracking.interface';

// DTOs
export {
  ShippingLocationDto,
  ShippingDimensionsDto,
  ShippingSearchDto,
} from './dto/shipping-search.dto';
export { TrackingDto, BatchTrackingDto } from './dto/tracking.dto';

// Constants
export { ARAMEX_CONFIG_TOKEN } from './aramex-config.module';
export { ARAMEX_ENDPOINTS, ARAMEX_BASE_URLS } from './constants/endpoints';