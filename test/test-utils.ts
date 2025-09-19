import { AramexConfig } from '../src/interfaces/aramex-config.interface';
import { ShipmentTrackingResponse, TrackingResult, ClientInfo } from '../src/interfaces/tracking.interface';

export const createMockAramexConfig = (overrides: Partial<AramexConfig> = {}): AramexConfig => ({
  username: 'test_user',
  password: 'test_password',
  accountNumber: '123456',
  accountPin: '1234',
  accountEntity: 'TEST',
  accountCountryCode: 'US',
  sandbox: true,
  timeout: 30000,
  debug: false,
  ...overrides,
});

export const createMockClientInfo = (overrides: Partial<ClientInfo> = {}): ClientInfo => ({
  UserName: 'test_user',
  Password: 'test_password',
  Version: 'v1.0',
  AccountNumber: '123456',
  AccountPin: '1234',
  AccountEntity: 'TEST',
  AccountCountryCode: 'US',
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