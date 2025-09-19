import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { of, throwError } from 'rxjs';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);

    // Mock logger
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('executeWithRateLimit', () => {
    it('should execute request when within rate limits', (done) => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      service.executeWithRateLimit(mockRequest).subscribe({
        next: (result) => {
          expect(result).toBe('success');
          expect(mockRequest).toHaveBeenCalledTimes(1);
          done();
        },
        error: done,
      });
    });

    it('should handle multiple requests within limits', (done) => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));
      let completedRequests = 0;

      // Execute 5 requests in quick succession
      for (let i = 0; i < 5; i++) {
        service.executeWithRateLimit(mockRequest, `key-${i}`).subscribe({
          next: (result) => {
            expect(result).toBe('success');
            completedRequests++;
            if (completedRequests === 5) {
              expect(mockRequest).toHaveBeenCalledTimes(5);
              done();
            }
          },
          error: done,
        });
      }
    });

    it('should delay requests when rate limit is exceeded', (done) => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      // First, fill up the rate limit
      const status = service.getRateLimitStatus('test-key');
      const maxRequests = 60; // Default limit

      // Execute requests to hit the limit
      for (let i = 0; i < maxRequests; i++) {
        service.executeWithRateLimit(mockRequest, 'test-key').subscribe();
      }

      // This request should be delayed
      service.executeWithRateLimit(mockRequest, 'test-key').subscribe({
        next: (result) => {
          expect(result).toBe('success');
          done();
        },
        error: done,
      });

      // Fast forward time to trigger the delayed execution
      jest.advanceTimersByTime(61000); // 61 seconds
    });

    it('should retry on rate limit errors', (done) => {
      const mockRequest = jest.fn()
        .mockReturnValueOnce(throwError(() => ({ statusCode: 429, message: 'Rate limit exceeded' })))
        .mockReturnValueOnce(of('success'));

      service.executeWithRateLimit(mockRequest).subscribe({
        next: (result) => {
          expect(result).toBe('success');
          expect(mockRequest).toHaveBeenCalledTimes(2);
          done();
        },
        error: done,
      });

      // Fast forward time to trigger retry
      jest.advanceTimersByTime(1000);
    });

    it('should give up after max retry attempts', (done) => {
      const rateLimitError = { statusCode: 429, message: 'Rate limit exceeded' };
      const mockRequest = jest.fn().mockReturnValue(throwError(() => rateLimitError));

      service.executeWithRateLimit(mockRequest).subscribe({
        next: () => done(new Error('Should have failed')),
        error: (error) => {
          expect(error.statusCode).toBe(429);
          expect(mockRequest).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
          done();
        },
      });

      // Fast forward time for all retries
      jest.advanceTimersByTime(10000);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return initial status for new key', () => {
      const status = service.getRateLimitStatus('new-key');

      expect(status.requestsRemaining).toBe(60);
      expect(status.isLimited).toBe(false);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track remaining requests', () => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      // Execute a few requests
      service.executeWithRateLimit(mockRequest, 'tracked-key').subscribe();
      service.executeWithRateLimit(mockRequest, 'tracked-key').subscribe();

      const status = service.getRateLimitStatus('tracked-key');
      expect(status.requestsRemaining).toBe(58); // 60 - 2
    });

    it('should indicate when rate limited', () => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      // Hit the rate limit
      for (let i = 0; i < 60; i++) {
        service.executeWithRateLimit(mockRequest, 'limited-key').subscribe();
      }

      const status = service.getRateLimitStatus('limited-key');
      expect(status.requestsRemaining).toBe(0);
      expect(status.isLimited).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update rate limit configuration', () => {
      service.updateConfig({
        maxRequestsPerMinute: 100,
        retryAttempts: 5,
      });

      expect(service['config'].maxRequestsPerMinute).toBe(100);
      expect(service['config'].retryAttempts).toBe(5);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific key', () => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      // Use up some requests
      service.executeWithRateLimit(mockRequest, 'reset-key').subscribe();
      service.executeWithRateLimit(mockRequest, 'reset-key').subscribe();

      let status = service.getRateLimitStatus('reset-key');
      expect(status.requestsRemaining).toBe(58);

      // Reset the rate limit
      service.resetRateLimit('reset-key');

      status = service.getRateLimitStatus('reset-key');
      expect(status.requestsRemaining).toBe(60);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit errors by status code', () => {
      const error429 = { statusCode: 429 };
      const error503 = { statusCode: 503 };
      const error404 = { statusCode: 404 };

      expect(service['isRateLimitError'](error429)).toBe(true);
      expect(service['isRateLimitError'](error503)).toBe(true);
      expect(service['isRateLimitError'](error404)).toBe(false);
    });

    it('should identify rate limit errors by message', () => {
      const rateLimitMessage = { message: 'Rate limit exceeded' };
      const tooManyRequestsMessage = { message: 'Too many requests' };
      const quotaMessage = { message: 'Quota exceeded' };
      const normalError = { message: 'Not found' };

      expect(service['isRateLimitError'](rateLimitMessage)).toBe(true);
      expect(service['isRateLimitError'](tooManyRequestsMessage)).toBe(true);
      expect(service['isRateLimitError'](quotaMessage)).toBe(true);
      expect(service['isRateLimitError'](normalError)).toBe(false);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should clean up expired entries', () => {
      const mockRequest = jest.fn().mockReturnValue(of('success'));

      // Create some entries
      service.executeWithRateLimit(mockRequest, 'key1').subscribe();
      service.executeWithRateLimit(mockRequest, 'key2').subscribe();

      expect(service['rateLimitMap'].size).toBe(2);

      // Fast forward past expiry time
      jest.advanceTimersByTime(120000); // 2 minutes

      // Trigger cleanup (normally happens via interval)
      service['cleanupExpiredEntries']();

      expect(service['rateLimitMap'].size).toBe(0);
    });
  });
});