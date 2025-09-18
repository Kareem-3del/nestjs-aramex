# Aramex NestJS Installation Guide

## Quick Setup

### 1. Install the package
```bash
npm install @aramax/nestjs-shipping
```

### 2. Configure in your NestJS app

**app.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { AramexModule } from '@aramax/nestjs-shipping';

@Module({
  imports: [
    AramexModule.forRoot({
      accountCountryCode: 'BH',
      accountEntity: 'BAH',
      accountNumber: '20000068',
      accountPin: '543543',
      username: 'testingapi@aramex.com',
      password: 'R123456789$r',
      sandbox: false, // Set true for testing
      timeout: 30000,
      debug: true
    })
  ],
})
export class AppModule {}
```

### 3. Use in your service

```typescript
import { Injectable } from '@nestjs/common';
import { TrackingService, ShippingService } from '@aramax/nestjs-shipping';

@Injectable()
export class MyService {
  constructor(
    private trackingService: TrackingService,
    private shippingService: ShippingService
  ) {}

  async trackPackage(trackingNumber: string) {
    return this.trackingService.trackPackage({
      trackingNumber,
      useSoap: false // Use REST API (recommended)
    }).toPromise();
  }

  async calculateRates(origin: string, destination: string) {
    return this.shippingService.calculateRates({
      origin: { country: 'BH', city: 'Manama' },
      destination: { country: 'AE', city: 'Dubai' },
      packageDetails: {
        length: 20, width: 15, height: 10,
        weight: 2.5, unit: 'kg', dimensionUnit: 'cm'
      }
    }).toPromise();
  }
}
```

## Your API Credentials (Already Configured)

- **Account Country**: BH
- **Account Entity**: BAH
- **Account Number**: 20000068
- **Account PIN**: 543543
- **Username**: testingapi@aramex.com
- **Password**: R123456789$r
- **Version**: 1.0

## Test Your Setup

Run the test file:
```bash
npx ts-node test-aramex.ts
```

✅ **Package is ready for npm install!**