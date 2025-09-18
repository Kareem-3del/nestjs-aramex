export const ARAMEX_ENDPOINTS = {
  SHIPPING: {
    CALCULATE_RATE: '/RateCalculator/Service_1_0.svc/json/CalculateRate',
  },
  TRACKING: {
    TRACK_SHIPMENTS_SOAP: 'http://ws.aramex.net/shippingapi/tracking/service_1_0.svc',
    WSDL: 'http://ws.aramex.net/shippingapi/tracking/service_1_0.svc?wsdl',
    SOAP_ACTION: 'http://ws.aramex.net/ShippingAPI/v1/Service_1_0/TrackShipments',
    // Keep legacy REST endpoint for backward compatibility
    TRACK_SHIPMENTS: '/Tracking/Service_1_0.svc/json/TrackShipments',
  },
} as const;

export const ARAMEX_BASE_URLS = {
  PRODUCTION: 'https://ws.aramex.net/ShippingAPI.V2',
  SANDBOX: 'https://ws.dev.aramex.net/ShippingAPI.V2',
  // SOAP endpoints
  SOAP_PRODUCTION: 'http://ws.aramex.net',
  SOAP_SANDBOX: 'http://ws.dev.aramex.net',
} as const;