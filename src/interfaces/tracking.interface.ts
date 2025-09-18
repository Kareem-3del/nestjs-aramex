// WSDL-based interfaces matching Aramex SOAP API
export interface ClientInfo {
  UserName: string;
  Password: string;
  Version: string;
  AccountNumber: string;
  AccountPin: string;
  AccountEntity: string;
  AccountCountryCode: string;
}

export interface Transaction {
  Reference1?: string;
  Reference2?: string;
  Reference3?: string;
  Reference4?: string;
  Reference5?: string;
}

export interface Notification {
  Code: string;
  Message: string;
}

export interface TrackingResult {
  WaybillNumber: string;
  UpdateCode: string;
  UpdateDescription: string;
  UpdateDateTime: string;
  UpdateLocation: string;
  Comments: string;
  ProblemCode?: string;
}

export interface ShipmentTrackingRequest {
  ClientInfo: ClientInfo;
  Transaction?: Transaction;
  Shipments: string[];
  GetLastTrackingUpdateOnly?: boolean;
}

export interface ShipmentTrackingResponse {
  Transaction?: Transaction;
  Notifications?: Notification[];
  HasErrors: boolean;
  TrackingResults?: {
    [key: string]: TrackingResult[];
  };
}

// Legacy interfaces for backward compatibility
export interface TrackingEvent {
  eventCode: string;
  eventDescription: string;
  eventDate: string;
  location: string;
}

export interface TrackingShipment {
  shipmentNumber: string;
  trackingNumber: string;
  status: string;
  statusDescription: string;
  currentLocation: string;
  estimatedDeliveryDate: string;
  shipmentEvents: TrackingEvent[];
}

export interface AramexTrackingResponse {
  hasErrors: boolean;
  errorMessage?: string;
  shipments: TrackingShipment[];
}

// Legacy interfaces for backward compatibility
export interface TrackingRequest {
  trackingNumber: string;
}

export interface TrackingResponse {
  success: boolean;
  trackingNumber: string;
  status: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  events: {
    timestamp: string;
    location: string;
    status: string;
    description: string;
    eventCode?: string;
  }[];
  packageInfo?: {
    weight?: number;
    dimensions?: string;
    service?: string;
  };
  requestId?: string;
  message?: string;
  errors?: string[];
}