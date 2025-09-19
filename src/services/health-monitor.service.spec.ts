import { Test, TestingModule } from '@nestjs/testing';
import { HealthMonitorService, PerformanceMetrics, HealthStatus, SystemStats } from './health-monitor.service';
import { AramexHttpService } from './aramex-http.service';
import { AramexSoapService } from './aramex-soap.service';
import { CacheManagerService } from './cache-manager.service';
import { RateLimiterService } from './rate-limiter.service';
import { of, throwError } from 'rxjs';
import { Logger } from '@nestjs/common';

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;
  let httpService: jest.Mocked<AramexHttpService>;
  let soapService: jest.Mocked<AramexSoapService>;
  let cacheManager: jest.Mocked<CacheManagerService>;
  let rateLimiter: jest.Mocked<RateLimiterService>;
  let loggerSpy: jest.SpiedFunction<any>;

  beforeEach(async () => {
    const httpServiceMock = {
      getClientInfo: jest.fn(),
    };

    const soapServiceMock = {
      isClientReady: jest.fn(),
    };

    const cacheManagerMock = {
      getStats: jest.fn(),
    };

    const rateLimiterMock = {
      getRateLimitStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthMonitorService,
        { provide: AramexHttpService, useValue: httpServiceMock },
        { provide: AramexSoapService, useValue: soapServiceMock },
        { provide: CacheManagerService, useValue: cacheManagerMock },
        { provide: RateLimiterService, useValue: rateLimiterMock },
      ],
    }).compile();

    service = module.get<HealthMonitorService>(HealthMonitorService);
    httpService = module.get(AramexHttpService);
    soapService = module.get(AramexSoapService);
    cacheManager = module.get(CacheManagerService);
    rateLimiter = module.get(RateLimiterService);

    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('monitorRequest', () => {
    it('should monitor successful request and record metrics', (done) => {
      const requestName = 'test-request';
      const testData = { result: 'success' };
      const requestFn = jest.fn(() => of(testData));

      service.monitorRequest(requestName, requestFn).subscribe((result) => {
        expect(result).toEqual(testData);
        expect(requestFn).toHaveBeenCalledTimes(1);

        setTimeout(() => {
          const metrics = service.getPerformanceMetrics();
          expect(metrics.requestCount).toBe(1);
          expect(metrics.errorRate).toBe(0);
          expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
          done();
        }, 10);
      });
    });

    it('should monitor failed request and record error metrics', (done) => {
      const requestName = 'test-request';
      const error = new Error('Request failed');
      const requestFn = jest.fn(() => throwError(() => error));

      service.monitorRequest(requestName, requestFn).subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toBe(error);

          const metrics = service.getPerformanceMetrics();
          expect(metrics.requestCount).toBe(1);
          expect(metrics.errorRate).toBe(100);
          done();
        }
      });
    });

    it('should track slow requests', (done) => {
      const requestName = 'slow-request';
      const testData = { result: 'success' };
      const requestFn = jest.fn(() => of(testData));

      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 1000;
        if (callCount === 2) return 1100;
        return originalDateNow();
      });

      service.updateThresholds({ slowRequestThreshold: 50 });

      service.monitorRequest(requestName, requestFn).subscribe((result) => {
        expect(result).toEqual(testData);

        const metrics = service.getPerformanceMetrics();
        expect(metrics.slowRequestCount).toBe(1);

        Date.now = originalDateNow;
        done();
      });
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are healthy', async () => {
      httpService.getClientInfo.mockReturnValue({ UserName: 'test-user' } as any);
      soapService.isClientReady.mockReturnValue(true);
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });

      const health = await service.performHealthCheck();

      expect(health.status).toBe('healthy');
      expect(health.httpService).toBe(true);
      expect(health.soapService).toBe(true);
      expect(health.cacheService).toBe(true);
      expect(health.errors).toHaveLength(0);
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when one service is unhealthy', async () => {
      httpService.getClientInfo.mockReturnValue({ UserName: 'test-user' } as any);
      soapService.isClientReady.mockReturnValue(false);
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });

      const health = await service.performHealthCheck();

      expect(health.status).toBe('degraded');
      expect(health.httpService).toBe(true);
      expect(health.soapService).toBe(false);
      expect(health.cacheService).toBe(true);
      expect(health.errors).toContain('SOAP service client not ready');
    });

    it('should return unhealthy status when multiple services are unhealthy', async () => {
      httpService.getClientInfo.mockReturnValue(null);
      soapService.isClientReady.mockReturnValue(false);
      cacheManager.getStats.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const health = await service.performHealthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.httpService).toBe(false);
      expect(health.soapService).toBe(false);
      expect(health.cacheService).toBe(false);
      expect(health.errors.length).toBeGreaterThan(2);
    });

    it('should handle HTTP service errors', async () => {
      httpService.getClientInfo.mockImplementation(() => {
        throw new Error('HTTP service error');
      });
      soapService.isClientReady.mockReturnValue(true);
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });

      const health = await service.performHealthCheck();

      expect(health.httpService).toBe(false);
      expect(health.errors.some(error => error.includes('HTTP service unhealthy'))).toBe(true);
    });

    it('should handle SOAP service errors', async () => {
      httpService.getClientInfo.mockReturnValue({ UserName: 'test-user' } as any);
      soapService.isClientReady.mockImplementation(() => {
        throw new Error('SOAP service error');
      });
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });

      const health = await service.performHealthCheck();

      expect(health.soapService).toBe(false);
      expect(health.errors.some(error => error.includes('SOAP service unhealthy'))).toBe(true);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return current performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('lastRequestTime');
      expect(metrics).toHaveProperty('slowRequestThreshold');
      expect(metrics).toHaveProperty('slowRequestCount');
    });

    it('should return a copy of metrics to prevent mutation', () => {
      const metrics1 = service.getPerformanceMetrics();
      const metrics2 = service.getPerformanceMetrics();

      metrics1.requestCount = 999;
      expect(metrics2.requestCount).not.toBe(999);
    });
  });

  describe('getSystemStats', () => {
    it('should return comprehensive system statistics', async () => {
      httpService.getClientInfo.mockReturnValue({ UserName: 'test-user' } as any);
      soapService.isClientReady.mockReturnValue(true);
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });
      rateLimiter.getRateLimitStatus.mockReturnValue({
        requestsRemaining: 100,
        isLimited: false,
        resetTime: Date.now() + 3600000
      });

      const stats = await service.getSystemStats();

      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('health');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('rateLimit');

      expect(stats.health.status).toBe('healthy');
      expect(stats.cache.totalEntries).toBe(10);
      expect(stats.rateLimit.requestsRemaining).toBe(100);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all performance metrics', (done) => {
      const requestFn = () => of({ test: 'data' });

      service.monitorRequest('test', requestFn).subscribe(() => {
        expect(service.getPerformanceMetrics().requestCount).toBe(1);

        service.resetMetrics();

        const metrics = service.getPerformanceMetrics();
        expect(metrics.requestCount).toBe(0);
        expect(metrics.averageResponseTime).toBe(0);
        expect(metrics.errorRate).toBe(0);
        expect(metrics.slowRequestCount).toBe(0);
        done();
      });
    });

    it('should preserve slow request threshold when resetting', () => {
      const originalThreshold = 2000;
      service.updateThresholds({ slowRequestThreshold: originalThreshold });

      service.resetMetrics();

      const metrics = service.getPerformanceMetrics();
      expect(metrics.slowRequestThreshold).toBe(originalThreshold);
    });
  });

  describe('updateThresholds', () => {
    it('should update slow request threshold', () => {
      const newThreshold = 3000;
      service.updateThresholds({ slowRequestThreshold: newThreshold });

      const metrics = service.getPerformanceMetrics();
      expect(metrics.slowRequestThreshold).toBe(newThreshold);
    });

    it('should not update threshold if not provided', () => {
      const originalMetrics = service.getPerformanceMetrics();
      const originalThreshold = originalMetrics.slowRequestThreshold;

      service.updateThresholds({});

      const updatedMetrics = service.getPerformanceMetrics();
      expect(updatedMetrics.slowRequestThreshold).toBe(originalThreshold);
    });
  });

  describe('getHealthEndpoint', () => {
    it('should return health status observable', (done) => {
      httpService.getClientInfo.mockReturnValue({ UserName: 'test-user' } as any);
      soapService.isClientReady.mockReturnValue(true);
      cacheManager.getStats.mockReturnValue({
        totalEntries: 10,
        expiredEntries: 0,
        hitRate: 0.8,
        memoryUsage: '1KB'
      });

      service.getHealthEndpoint().subscribe((result) => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('timestamp');
        expect(result.status).toBe('healthy');
        expect(typeof result.timestamp).toBe('number');
        done();
      });
    });

    it('should handle errors in health endpoint', async () => {
      httpService.getClientInfo.mockImplementation(() => {
        throw new Error('Service error');
      });

      try {
        await service.getHealthEndpoint().toPromise();
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('error rate calculation', () => {
    it('should calculate error rate correctly', (done) => {
      const successRequest = () => of({ success: true });
      const errorRequest = () => throwError(() => new Error('Error'));

      let completedRequests = 0;
      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === 4) {
          const metrics = service.getPerformanceMetrics();
          expect(metrics.requestCount).toBe(4);
          expect(metrics.errorRate).toBe(50);
          done();
        }
      };

      service.monitorRequest('success1', successRequest).subscribe(checkCompletion);
      service.monitorRequest('error1', errorRequest).subscribe({
        error: checkCompletion
      });
      service.monitorRequest('success2', successRequest).subscribe(checkCompletion);
      service.monitorRequest('error2', errorRequest).subscribe({
        error: checkCompletion
      });
    });
  });

  describe('average response time calculation', () => {
    it('should calculate average response time correctly', (done) => {
      const fastRequest = () => of({ fast: true });
      const slowRequest = () => of({ slow: true });

      let completedRequests = 0;
      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === 2) {
          setTimeout(() => {
            const metrics = service.getPerformanceMetrics();
            expect(metrics.requestCount).toBe(2);
            expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
            done();
          }, 10);
        }
      };

      service.monitorRequest('fast', fastRequest).subscribe(checkCompletion);
      service.monitorRequest('slow', slowRequest).subscribe(checkCompletion);
    });
  });

  describe('request history limit', () => {
    it('should limit request history to maxRequestHistory', async () => {
      const maxHistory = 100;
      const request = () => of({ data: 'test' });

      for (let i = 0; i < maxHistory + 10; i++) {
        await service.monitorRequest(`request-${i}`, request).toPromise();
      }

      const metrics = service.getPerformanceMetrics();
      expect(metrics.requestCount).toBe(maxHistory + 10);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });
  });
});