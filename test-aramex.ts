import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AramexModule, AramexConfig, TrackingService, ShippingService } from './src';

// SECURITY: Configuration from environment variables only
if (!process.env.ARAMEX_USERNAME || !process.env.ARAMEX_PASSWORD) {
  console.error('❌ Missing required environment variables');
  console.error('Please configure ARAMEX_USERNAME, ARAMEX_PASSWORD, and other credentials in your .env file');
  process.exit(1);
}

const aramexConfig: AramexConfig = {
  accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE!,
  accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY!,
  accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER!,
  accountPin: process.env.ARAMEX_ACCOUNT_PIN!,
  username: process.env.ARAMEX_USERNAME!,
  password: process.env.ARAMEX_PASSWORD!,
  sandbox: true, // Set to true if using sandbox environment
  timeout: 30000,
  debug: true
};

@Module({
  imports: [
    AramexModule.forRoot(aramexConfig)
  ],
})
class TestAppModule {}

async function testAramexAPI() {
  const app = await NestFactory.createApplicationContext(TestAppModule);

  const trackingService = app.get(TrackingService);
  const shippingService = app.get(ShippingService);

  console.log('🚀 Testing Aramex API with your credentials...\n');

  try {
    // Test 1: Track a package
    console.log('📦 Test 1: Tracking a package...');
    const trackingResult = await trackingService.trackPackage({
      trackingNumber: '47384974350',
      useSoap: true
    }).toPromise();

    console.log('✅ Tracking successful!');
    console.log('Status:', trackingResult.status);
    console.log('Current Location:', trackingResult.currentLocation);
    console.log('Events count:', trackingResult.events.length);
    console.log('');

  } catch (error) {
    console.log('❌ Tracking test failed:', error instanceof Error ? error.message : String(error));
    console.log('');
  }

  try {
    // Test 2: Calculate shipping rates
    console.log('💰 Test 2: Calculating shipping rates...');
    const rateResult = await shippingService.calculateRates({
      origin: {
        country: 'BH',
        city: 'Manama'
      },
      destination: {
        country: 'AE',
        city: 'Dubai'
      },
      packageDetails: {
        length: 20,
        width: 15,
        height: 10,
        weight: 2.5,
        unit: 'kg',
        dimensionUnit: 'cm'
      }
    }).toPromise();

    console.log('✅ Rate calculation successful!');
    console.log('Available services:', rateResult.services?.length || 0);
    rateResult.services?.forEach(service => {
      console.log(`- ${service.serviceName}: ${service.cost?.amount || 'N/A'} ${service.cost?.currency || ''}`);
    });

  } catch (error) {
    console.log('❌ Rate calculation test failed:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 Testing complete!');
  await app.close();
}

// Run the test
if (require.main === module) {
  testAramexAPI().catch(console.error);
}

export { testAramexAPI };
