# @aramax/nestjs-shipping

A NestJS library for Aramax shipping search and tracking functionality, providing a clean and type-safe interface for integrating with Aramax shipping services.

## Features

- ✅ **Shipping Search**: Search for available shipping services and calculate costs
- ✅ **Package Tracking**: Track packages with both standard and amkeit tracking types
- ✅ **Batch Operations**: Track multiple packages in a single request
- ✅ **Type Safety**: Full TypeScript support with comprehensive interfaces and DTOs
- ✅ **Validation**: Built-in request validation using class-validator
- ✅ **Error Handling**: Comprehensive error handling with custom exceptions
- ✅ **Configuration**: Flexible configuration with sync and async options
- ✅ **Logging**: Built-in logging with configurable debug mode

## Installation

```bash
npm install @aramax/nestjs-shipping
```

## Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { AramaxModule } from '@aramax/nestjs-shipping';

@Module({
  imports: [
    AramaxModule.forRoot({
      baseUrl: 'https://api.aramax.com',
      apiKey: 'your-api-key',
      clientId: 'your-client-id', // optional
      timeout: 30000, // optional, default: 30000ms
      debug: false, // optional, default: false
    }),
  ],
})
export class AppModule {}
```

### 2. Async Configuration

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AramaxModule } from '@aramax/nestjs-shipping';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AramaxModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        baseUrl: configService.get('ARAMAX_BASE_URL'),
        apiKey: configService.get('ARAMAX_API_KEY'),
        clientId: configService.get('ARAMAX_CLIENT_ID'),
        timeout: configService.get('ARAMAX_TIMEOUT', 30000),
        debug: configService.get('ARAMAX_DEBUG', false),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Use in Services

```typescript
import { Injectable } from '@nestjs/common';
import { ShippingService, TrackingService } from '@aramax/nestjs-shipping';

@Injectable()
export class MyService {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly trackingService: TrackingService,
  ) {}

  async searchShipping() {
    const searchRequest = {
      origin: {
        country: 'AE',
        city: 'Dubai',
        postalCode: '12345',
      },
      destination: {
        country: 'US',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      },
      packageDetails: {
        length: 20,
        width: 15,
        height: 10,
        weight: 2.5,
        unit: 'kg' as const,
        dimensionUnit: 'cm' as const,
      },
    };

    return this.shippingService.searchShippingServices(searchRequest).toPromise();
  }

  async trackPackage(trackingNumber: string) {
    return this.trackingService.trackPackage({
      trackingNumber,
      trackingType: 'standard',
    }).toPromise();
  }

  async trackAmkeitPackage(trackingNumber: string) {
    return this.trackingService.trackPackage({
      trackingNumber,
      trackingType: 'amkeit',
    }).toPromise();
  }
}
```

## API Reference

### ShippingService

#### searchShippingServices(searchRequest: ShippingSearchDto)
Search for available shipping services based on origin, destination, and package details.

#### calculateShippingCost(searchRequest: ShippingSearchDto)
Calculate shipping costs for a specific route and package.

#### getAvailableServices(origin: string, destination: string)
Get available services for a specific route.

### TrackingService

#### trackPackage(trackingRequest: TrackingDto)
Track a single package using tracking number. Supports both 'standard' and 'amkeit' tracking types.

#### trackMultiplePackages(trackingNumbers: string[], trackingType?)
Track multiple packages in a single request.

#### getTrackingHistory(trackingNumber: string, trackingType?)
Get full tracking history for a package.

#### getPackageStatus(trackingNumber: string, trackingType?)
Get current status of a package without full history.

## Data Types

### ShippingSearchDto
```typescript
{
  origin: {
    country: string;
    city: string;
    postalCode?: string;
    state?: string;
    address?: string;
  };
  destination: {
    country: string;
    city: string;
    postalCode?: string;
    state?: string;
    address?: string;
  };
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
```

### TrackingDto
```typescript
{
  trackingNumber: string;
  trackingType?: 'amkeit' | 'standard';
}
```

## Environment Variables

Create a `.env` file with the following variables:

```env
ARAMAX_BASE_URL=https://api.aramax.com
ARAMAX_API_KEY=your-aramax-api-key
ARAMAX_CLIENT_ID=your-client-id
ARAMAX_TIMEOUT=30000
ARAMAX_DEBUG=false
```

## Error Handling

The library provides comprehensive error handling with custom exceptions:

```typescript
import { AramaxHttpException } from '@aramax/nestjs-shipping';

try {
  const result = await this.shippingService.searchShippingServices(request).toPromise();
} catch (error) {
  if (error instanceof AramaxHttpException) {
    console.log('Status Code:', error.statusCode);
    console.log('Response:', error.response);
  }
}
```

## Development

To build the library:

```bash
npm run build
```

To watch for changes during development:

```bash
npm run dev
```

## License

MIT