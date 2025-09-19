import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagerService } from './cache-manager.service';
import { of, throwError, delay } from 'rxjs';
import { Logger } from '@nestjs/common';

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let loggerSpy: jest.SpiedFunction<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheManagerService],
    }).compile();

    service = module.get<CacheManagerService>(CacheManagerService);
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    service.clear();
  });

  describe('getOrSet', () => {
    it('should cache and return data from provider on cache miss', (done) => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };
      const provider = jest.fn(() => of(testData));

      service.getOrSet(key, provider).subscribe((result) => {
        expect(result).toEqual(testData);
        expect(provider).toHaveBeenCalledTimes(1);
        expect(service.has(key)).toBe(true);
        done();
      });
    });

    it('should return cached data on cache hit', (done) => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };
      const provider = jest.fn(() => of(testData));

      service.getOrSet(key, provider).subscribe(() => {
        service.getOrSet(key, provider).subscribe((result) => {
          expect(result).toEqual(testData);
          expect(provider).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should use custom TTL when provided', (done) => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };
      const provider = jest.fn(() => of(testData));
      const customTtl = 1000;

      service.getOrSet(key, provider, customTtl).subscribe(() => {
        const ttl = service.getTtl(key);
        expect(ttl).toBeLessThanOrEqual(customTtl);
        expect(ttl).toBeGreaterThan(0);
        done();
      });
    });

    it('should evict oldest entries when cache is full', (done) => {
      service.updateConfig({ maxCacheSize: 2 });

      const provider1 = () => of('data1');
      const provider2 = () => of('data2');
      const provider3 = () => of('data3');

      service.getOrSet('key1', provider1).subscribe(() => {
        service.getOrSet('key2', provider2).subscribe(() => {
          service.getOrSet('key3', provider3).subscribe(() => {
            expect(service.has('key1')).toBe(false);
            expect(service.has('key2')).toBe(true);
            expect(service.has('key3')).toBe(true);
            done();
          });
        });
      });
    });

    it('should handle concurrent requests with same key', (done) => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };
      const provider = jest.fn(() => of(testData));

      service.getOrSet(key, provider).subscribe(() => {
        service.getOrSet(key, provider).subscribe(() => {
          expect(provider).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });
  });

  describe('cacheTrackingData', () => {
    it('should cache tracking data with appropriate TTL', (done) => {
      const trackingNumber = 'TRK123';
      const testData = { status: 'in-transit' };
      const provider = jest.fn(() => of(testData));

      service.cacheTrackingData(trackingNumber, provider).subscribe((result) => {
        expect(result).toEqual(testData);
        expect(service.has(`tracking:${trackingNumber}`)).toBe(true);
        done();
      });
    });
  });

  describe('cacheShippingRates', () => {
    it('should cache shipping rates with appropriate TTL', (done) => {
      const origin = 'US';
      const destination = 'CA';
      const packageHash = 'hash123';
      const testData = { rate: 25.50 };
      const provider = jest.fn(() => of(testData));

      service.cacheShippingRates(origin, destination, packageHash, provider).subscribe((result) => {
        expect(result).toEqual(testData);
        expect(service.has(`shipping:${origin}:${destination}:${packageHash}`)).toBe(true);
        done();
      });
    });
  });

  describe('get', () => {
    it('should return cached data if not expired', () => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };

      service.set(key, testData);
      expect(service.get(key)).toEqual(testData);
    });

    it('should return null for non-existent key', () => {
      expect(service.get('non-existent')).toBeNull();
    });

    it('should return null for expired data', () => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };

      service.set(key, testData, -1000);
      expect(service.get(key)).toBeNull();
    });
  });

  describe('set', () => {
    it('should manually set cache data', () => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };

      service.set(key, testData);
      expect(service.get(key)).toEqual(testData);
    });

    it('should use custom TTL when provided', () => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };
      const customTtl = 2000;

      service.set(key, testData, customTtl);
      const ttl = service.getTtl(key);
      expect(ttl).toBeLessThanOrEqual(customTtl);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('delete', () => {
    it('should delete existing cache entry', () => {
      const key = 'test-key';
      const testData = { id: 1, name: 'test' };

      service.set(key, testData);
      expect(service.delete(key)).toBe(true);
      expect(service.has(key)).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(service.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2');

      service.clear();
      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(false);
    });
  });

  describe('clearByPattern', () => {
    it('should clear entries matching pattern', () => {
      service.set('tracking:123', 'data1');
      service.set('tracking:456', 'data2');
      service.set('shipping:789', 'data3');

      const deletedCount = service.clearByPattern('^tracking:');
      expect(deletedCount).toBe(2);
      expect(service.has('tracking:123')).toBe(false);
      expect(service.has('tracking:456')).toBe(false);
      expect(service.has('shipping:789')).toBe(true);
    });

    it('should return 0 when no entries match pattern', () => {
      service.set('key1', 'data1');
      const deletedCount = service.clearByPattern('^tracking:');
      expect(deletedCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      service.set('key1', 'data1');
      service.set('key2', 'data2', -1000);

      const stats = service.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.memoryUsage).toContain('KB');
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired entry', () => {
      const key = 'test-key';
      service.set(key, 'data');
      expect(service.has(key)).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(service.has('non-existent')).toBe(false);
    });

    it('should return false for expired entry', () => {
      const key = 'test-key';
      service.set(key, 'data', -1000);
      expect(service.has(key)).toBe(false);
    });
  });

  describe('getTtl', () => {
    it('should return remaining TTL for existing entry', () => {
      const key = 'test-key';
      const ttl = 5000;
      service.set(key, 'data', ttl);

      const remainingTtl = service.getTtl(key);
      expect(remainingTtl).toBeLessThanOrEqual(ttl);
      expect(remainingTtl).toBeGreaterThan(0);
    });

    it('should return -1 for non-existent entry', () => {
      expect(service.getTtl('non-existent')).toBe(-1);
    });

    it('should return 0 for expired entry', () => {
      const key = 'test-key';
      service.set(key, 'data', -1000);
      expect(service.getTtl(key)).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update cache configuration', () => {
      const newConfig = { defaultTtlMs: 10000, maxCacheSize: 500 };
      service.updateConfig(newConfig);

      service.set('key1', 'data1');
      const ttl = service.getTtl('key1');
      expect(ttl).toBeLessThanOrEqual(newConfig.defaultTtlMs);
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hash for same object', () => {
      const obj = { id: 1, name: 'test' };
      const hash1 = service.generateHash(obj);
      const hash2 = service.generateHash(obj);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different objects', () => {
      const obj1 = { id: 1, name: 'test1' };
      const obj2 = { id: 2, name: 'test2' };
      const hash1 = service.generateHash(obj1);
      const hash2 = service.generateHash(obj2);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash with only alphanumeric characters', () => {
      const obj = { id: 1, name: 'test' };
      const hash = service.generateHash(obj);
      expect(hash).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('private methods', () => {
    it('should clean up expired entries periodically', () => {
      service.set('key1', 'data1', -1000);
      service.set('key2', 'data2', 10000);

      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle provider errors gracefully', (done) => {
      const key = 'test-key';
      const error = new Error('Provider error');
      const provider = jest.fn(() => throwError(error));

      service.getOrSet(key, provider).subscribe({
        next: () => {
          done.fail('Should have thrown error');
        },
        error: (err) => {
          expect(err).toBe(error);
          expect(service.has(key)).toBe(false);
          done();
        }
      });
    });
  });
});