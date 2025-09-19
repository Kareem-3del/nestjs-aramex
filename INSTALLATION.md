# Aramex NestJS Installation Guide

## Quick Setup

### 1. Install the package
```bash
npm install @kareem-3del/nestjs-aramex
```

### 2. Configure in your NestJS app

**app.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { AramexModule } from '@kareem-3del/nestjs-aramex';

@Module({
  imports: [
    AramexModule.forRoot({
      accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE,
      accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY,
      accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
      accountPin: process.env.ARAMEX_ACCOUNT_PIN,
      username: process.env.ARAMEX_USERNAME,
      password: process.env.ARAMEX_PASSWORD,
      sandbox: true, // Set false for production
      timeout: 30000,
      debug: false
    })
  ],
})
export class AppModule {}
```

### 3. Use in your service

```typescript
import { Injectable } from '@nestjs/common';
import { TrackingService, ShippingService } from '@kareem-3del/nestjs-aramex';

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

## Configuration

⚠️ **SECURITY WARNING**: Never hardcode credentials in your source code!

Create a `.env` file in your project root:

```env
ARAMEX_ACCOUNT_COUNTRY_CODE=your_country_code
ARAMEX_ACCOUNT_ENTITY=your_entity
ARAMEX_ACCOUNT_NUMBER=your_account_number
ARAMEX_ACCOUNT_PIN=your_account_pin
ARAMEX_USERNAME=your_username
ARAMEX_PASSWORD=your_password
ARAMEX_VERSION=1.0
ARAMEX_SANDBOX=true
```

Then use environment variables in your configuration.

## Test Your Setup

Run the test file:
```bash
npx ts-node test-aramex.ts
```

✅ **Package is ready for npm install!**
