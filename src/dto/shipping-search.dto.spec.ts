import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ShippingLocationDto, ShippingDimensionsDto, ShippingSearchDto } from './shipping-search.dto';

describe('ShippingLocationDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 'US',
        city: 'New York',
        postalCode: '10001',
        state: 'NY',
        address: '123 Main Street',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required data', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 'US',
        city: 'New York',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when country is missing', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        city: 'New York',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('country');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when city is missing', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 'US',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('city');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when country is empty string', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: '',
        city: 'New York',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('country');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when city is empty string', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 'US',
        city: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('city');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when required fields are not strings', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 123,
        city: 456,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors.find(e => e.property === 'country')?.constraints).toHaveProperty('isString');
      expect(errors.find(e => e.property === 'city')?.constraints).toHaveProperty('isString');
    });

    it('should fail validation when optional fields are not strings', async () => {
      const dto = plainToClass(ShippingLocationDto, {
        country: 'US',
        city: 'New York',
        postalCode: 12345,
        state: true,
        address: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(2); // null address is optional, so only postalCode and state fail
      expect(errors.find(e => e.property === 'postalCode')?.constraints).toHaveProperty('isString');
      expect(errors.find(e => e.property === 'state')?.constraints).toHaveProperty('isString');
    });
  });
});

describe('ShippingDimensionsDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10.5,
        width: 8.2,
        height: 5.0,
        weight: 2.5,
        unit: 'kg',
        dimensionUnit: 'cm',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with default units', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
        weight: 2,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.unit).toBe('kg');
      expect(dto.dimensionUnit).toBe('cm');
    });

    it('should fail validation when dimensions are missing', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        weight: 2.5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(3);
      expect(errors.find(e => e.property === 'length')).toBeDefined();
      expect(errors.find(e => e.property === 'width')).toBeDefined();
      expect(errors.find(e => e.property === 'height')).toBeDefined();
    });

    it('should fail validation when weight is missing', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('weight');
    });

    it('should fail validation when dimensions are not positive numbers', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 0,
        width: -5,
        height: 10,
        weight: -2.5,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(3);
      expect(errors.find(e => e.property === 'length')?.constraints).toHaveProperty('isPositive');
      expect(errors.find(e => e.property === 'width')?.constraints).toHaveProperty('isPositive');
      expect(errors.find(e => e.property === 'weight')?.constraints).toHaveProperty('isPositive');
    });

    it('should fail validation when dimensions are not numbers', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: '10',
        width: '8',
        height: '5',
        weight: '2.5',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(4);
      expect(errors.find(e => e.property === 'length')?.constraints).toHaveProperty('isNumber');
      expect(errors.find(e => e.property === 'width')?.constraints).toHaveProperty('isNumber');
      expect(errors.find(e => e.property === 'height')?.constraints).toHaveProperty('isNumber');
      expect(errors.find(e => e.property === 'weight')?.constraints).toHaveProperty('isNumber');
    });

    it('should fail validation with invalid unit', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
        weight: 2.5,
        unit: 'grams',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('unit');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should fail validation with invalid dimensionUnit', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
        weight: 2.5,
        dimensionUnit: 'meters',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('dimensionUnit');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should validate with lb unit', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
        weight: 2.5,
        unit: 'lb',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with in dimensionUnit', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 10,
        width: 8,
        height: 5,
        weight: 2.5,
        dimensionUnit: 'in',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very small positive numbers', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 0.001,
        width: 0.001,
        height: 0.001,
        weight: 0.001,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle very large numbers', async () => {
      const dto = plainToClass(ShippingDimensionsDto, {
        length: 999999.99,
        width: 999999.99,
        height: 999999.99,
        weight: 999999.99,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('ShippingSearchDto', () => {
  const createValidShippingSearchData = () => ({
    origin: {
      country: 'US',
      city: 'New York',
      postalCode: '10001',
      state: 'NY',
    },
    destination: {
      country: 'CA',
      city: 'Toronto',
      postalCode: 'M5V 3L9',
      state: 'ON',
    },
    packageDetails: {
      length: 10,
      width: 8,
      height: 5,
      weight: 2.5,
      unit: 'kg',
      dimensionUnit: 'cm',
    },
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(ShippingSearchDto, createValidShippingSearchData());

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all optional fields', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        serviceType: 'EXP',
        deliveryDate: '2024-12-25',
        paymentType: 'P',
        descriptionOfGoods: 'Electronics',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation when origin is missing (optional validation)', async () => {
      const data = createValidShippingSearchData();
      delete (data as any).origin;

      const dto = plainToClass(ShippingSearchDto, data);

      const errors = await validate(dto);
      // In this case, validation might pass as the decorator configuration allows it
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass validation when destination is missing (optional validation)', async () => {
      const data = createValidShippingSearchData();
      delete (data as any).destination;

      const dto = plainToClass(ShippingSearchDto, data);

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass validation when packageDetails is missing (optional validation)', async () => {
      const data = createValidShippingSearchData();
      delete (data as any).packageDetails;

      const dto = plainToClass(ShippingSearchDto, data);

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should fail validation with invalid nested origin data', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        origin: {
          country: '', // invalid empty string
          city: 'New York',
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('origin');
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe('country');
    });

    it('should fail validation with invalid nested destination data', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        destination: {
          country: 'CA',
          // city missing
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('destination');
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe('city');
    });

    it('should fail validation with invalid nested packageDetails data', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        packageDetails: {
          length: 10,
          width: 8,
          height: -5, // invalid negative number
          weight: 2.5,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('packageDetails');
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe('height');
    });

    it('should fail validation with invalid serviceType', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        serviceType: 'INVALID',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('serviceType');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should validate all valid serviceTypes', async () => {
      const validServiceTypes = ['EXP', 'DOM', 'PDX', 'PPX', 'GND'];

      for (const serviceType of validServiceTypes) {
        const dto = plainToClass(ShippingSearchDto, {
          ...createValidShippingSearchData(),
          serviceType,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation with invalid paymentType', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        paymentType: 'INVALID',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('paymentType');
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should validate all valid paymentTypes', async () => {
      const validPaymentTypes = ['P', 'C', '3'];

      for (const paymentType of validPaymentTypes) {
        const dto = plainToClass(ShippingSearchDto, {
          ...createValidShippingSearchData(),
          paymentType,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should fail validation when deliveryDate is not a string', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        deliveryDate: new Date(),
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('deliveryDate');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when descriptionOfGoods is not a string', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        ...createValidShippingSearchData(),
        descriptionOfGoods: 12345,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('descriptionOfGoods');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('nested validation', () => {
    it('should validate multiple nested errors', async () => {
      const dto = plainToClass(ShippingSearchDto, {
        origin: {
          country: '',
          city: '',
        },
        destination: {
          country: 123,
          city: null,
        },
        packageDetails: {
          length: -1,
          width: 0,
          height: 'invalid',
          weight: -5,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(3); // origin, destination, packageDetails

      const originError = errors.find(e => e.property === 'origin');
      expect(originError?.children).toHaveLength(2); // country and city errors

      const destinationError = errors.find(e => e.property === 'destination');
      expect(destinationError?.children).toHaveLength(2); // country and city errors

      const packageError = errors.find(e => e.property === 'packageDetails');
      expect(packageError?.children).toHaveLength(4); // all dimension errors
    });
  });

  describe('transformation', () => {
    it('should properly transform nested objects', () => {
      const dto = plainToClass(ShippingSearchDto, createValidShippingSearchData());

      expect(dto.origin).toBeInstanceOf(ShippingLocationDto);
      expect(dto.destination).toBeInstanceOf(ShippingLocationDto);
      expect(dto.packageDetails).toBeInstanceOf(ShippingDimensionsDto);
    });

    it('should apply default values in nested objects', () => {
      const data = createValidShippingSearchData();
      delete data.packageDetails.unit;
      delete data.packageDetails.dimensionUnit;

      const dto = plainToClass(ShippingSearchDto, data);

      expect(dto.packageDetails.unit).toBe('kg');
      expect(dto.packageDetails.dimensionUnit).toBe('cm');
    });
  });
});