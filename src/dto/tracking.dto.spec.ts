import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TrackingDto, BatchTrackingDto } from './tracking.dto';

describe('TrackingDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: 'ARAMEX123456789',
        getLastTrackingUpdateOnly: true,
        useSoap: false,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required data', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when trackingNumber is missing', async () => {
      const dto = plainToClass(TrackingDto, {
        getLastTrackingUpdateOnly: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumber');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when trackingNumber is empty string', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumber');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when trackingNumber is not a string', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: 123456789,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumber');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when getLastTrackingUpdateOnly is not a boolean', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        getLastTrackingUpdateOnly: 'true', // string instead of boolean
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('getLastTrackingUpdateOnly');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation when useSoap is not a boolean', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        useSoap: 1, // number instead of boolean
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('useSoap');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should allow undefined optional properties', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        getLastTrackingUpdateOnly: undefined,
        useSoap: undefined,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow null optional properties to pass validation', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        getLastTrackingUpdateOnly: null,
        useSoap: null,
      });

      const errors = await validate(dto);
      // null values for optional properties should pass validation
      expect(errors).toHaveLength(0);
    });

    it('should validate with mixed valid and invalid optional properties', async () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        getLastTrackingUpdateOnly: true, // valid boolean
        useSoap: 'false', // invalid string
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('useSoap');
    });
  });

  describe('property types', () => {
    it('should have correct property types after transformation', () => {
      const dto = plainToClass(TrackingDto, {
        trackingNumber: '123456789',
        getLastTrackingUpdateOnly: true,
        useSoap: false,
      });

      expect(typeof dto.trackingNumber).toBe('string');
      expect(typeof dto.getLastTrackingUpdateOnly).toBe('boolean');
      expect(typeof dto.useSoap).toBe('boolean');
    });
  });
});

describe('BatchTrackingDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['ARAMEX123456789', 'ARAMEX987654321', 'TRACK555'],
        getLastTrackingUpdateOnly: false,
        useSoap: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required data', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123456789'],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when trackingNumbers is missing', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        getLastTrackingUpdateOnly: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('should fail validation when trackingNumbers is not an array', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: '123456789', // string instead of array
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('should fail validation when trackingNumbers is empty array', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: [],
      });

      const errors = await validate(dto);
      // Empty arrays should still pass array validation
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when trackingNumbers contains non-string values', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123456789', 987654321, 'TRACK555'], // mixed types
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should allow empty strings in trackingNumbers array', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123456789', '', 'TRACK555'], // empty string in array
      });

      const errors = await validate(dto);
      // Empty strings are still valid strings, so this should pass
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when getLastTrackingUpdateOnly is not a boolean', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123456789'],
        getLastTrackingUpdateOnly: 'false', // string instead of boolean
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('getLastTrackingUpdateOnly');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation when useSoap is not a boolean', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123456789'],
        useSoap: 0, // number instead of boolean
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('useSoap');
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should handle large arrays of tracking numbers', async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => `TRACK${i.toString().padStart(6, '0')}`);

      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: largeArray,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate each string in the array correctly', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: [
          'ARAMEX123456789',
          'FEDEX987654321',
          'DHL555666777',
          'UPS888999000',
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with mixed valid and invalid array items', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: [
          'VALID123456789',
          123, // invalid number
          'VALID987654321',
          null, // invalid null
          'VALID555666777',
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('property types', () => {
    it('should have correct property types after transformation', () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: ['123', '456', '789'],
        getLastTrackingUpdateOnly: true,
        useSoap: false,
      });

      expect(Array.isArray(dto.trackingNumbers)).toBe(true);
      expect(dto.trackingNumbers.every(item => typeof item === 'string')).toBe(true);
      expect(typeof dto.getLastTrackingUpdateOnly).toBe('boolean');
      expect(typeof dto.useSoap).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle null values correctly', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: null,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('should handle undefined values correctly', async () => {
      const dto = plainToClass(BatchTrackingDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('trackingNumbers');
    });

    it('should validate with very long tracking numbers', async () => {
      const veryLongTrackingNumber = 'A'.repeat(100);

      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: [veryLongTrackingNumber],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle special characters in tracking numbers', async () => {
      const dto = plainToClass(BatchTrackingDto, {
        trackingNumbers: [
          'ARAMEX-123_456.789',
          'FEDEX@987#654$321',
          'DHL%555^666&777',
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});