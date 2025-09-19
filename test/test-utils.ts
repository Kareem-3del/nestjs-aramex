import { AramexConfig } from '../src/interfaces/aramex-config.interface';
import { ShipmentTrackingResponse, TrackingResult, ClientInfo } from '../src/interfaces/tracking.interface';

export const createMockAramexConfig = (overrides: Partial<AramexConfig> = {}): AramexConfig => ({
  username: 'mock_user',
  password: 'mock_password',
  accountNumber: 'mock_account',
  accountPin: 'mock_pin',
  accountEntity: 'MOCK',
  accountCountryCode: 'XX',
  sandbox: true,
  timeout: 30000,
  debug: false,
  ...overrides,
});

export const createMockClientInfo = (overrides: Partial<ClientInfo> = {}): ClientInfo => ({
  UserName: 'mock_user',
  Password: 'mock_password',
  Version: 'v1.0',
  AccountNumber: 'mock_account',
  AccountPin: 'mock_pin',
  AccountEntity: 'MOCK',
  AccountCountryCode: 'XX',
  ...overrides,
});

export const createMockTrackingResult = (overrides: Partial<TrackingResult> = {}): TrackingResult => ({
  WaybillNumber: '123456789',
  UpdateCode: 'OFD',
  UpdateDescription: 'Out for Delivery',
  UpdateDateTime: '2024-01-15T10:30:00Z',
  UpdateLocation: 'New York, NY',
  Comments: 'Package is out for delivery',
  ...overrides,
});

export const createMockSoapTrackingResponse = (
  trackingResults?: Record<string, TrackingResult[]>,
  hasErrors = false
): ShipmentTrackingResponse => ({
  HasErrors: hasErrors,
  Notifications: hasErrors ? [{ Code: 'ERROR001', Message: 'Test error' }] : [],
  TrackingResults: trackingResults || {
    '123456789': [createMockTrackingResult()],
  },
  Transaction: {
    Reference1: 'TEST-REF',
  },
});

export const createMockHttpTrackingResponse = (hasErrors = false) => ({
  hasErrors,
  errorMessage: hasErrors ? 'Test HTTP error' : undefined,
  shipments: hasErrors ? [] : [
    {
      shipmentNumber: '123456789',
      trackingNumber: '123456789',
      status: 'OFD',
      statusDescription: 'Out for Delivery',
      currentLocation: 'New York, NY',
      estimatedDeliveryDate: '2024-01-16',
      shipmentEvents: [
        {
          eventCode: 'OFD',
          eventDescription: 'Out for Delivery',
          eventDate: '2024-01-15T10:30:00Z',
          location: 'New York, NY',
        },
        {
          eventCode: 'DLV',
          eventDescription: 'Delivered',
          eventDate: '2024-01-15T15:30:00Z',
          location: 'New York, NY',
        },
      ],
    },
  ],
});

export const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
};

export class MockHttpService {
  get = jest.fn();
  post = jest.fn();
  put = jest.fn();
  delete = jest.fn();
}

export class MockSoapClient {
  TrackShipments = jest.fn();
  setEndpoint = jest.fn();
  addSoapHeader = jest.fn();
}