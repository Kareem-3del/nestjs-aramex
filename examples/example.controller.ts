import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ShippingService,
  TrackingService,
  ShippingSearchDto,
  TrackingDto,
  ShippingSearchResponse,
  TrackingResponse,
} from '../src';

@Controller('aramex')
export class ExampleController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly trackingService: TrackingService,
  ) {}

  @Post('shipping/rates')
  calculateRates(@Body() searchDto: ShippingSearchDto): Observable<ShippingSearchResponse> {
    return this.shippingService.calculateRates(searchDto);
  }

  @Post('shipping/search')
  searchShipping(@Body() searchDto: ShippingSearchDto): Observable<ShippingSearchResponse> {
    return this.shippingService.calculateRates(searchDto);
  }

  @Get('shipping/services')
  getServices(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
  ): Observable<ShippingSearchResponse> {
    return this.shippingService.getAvailableServices(origin, destination);
  }

  @Post('tracking')
  trackPackage(@Body() trackingDto: TrackingDto): Observable<TrackingResponse> {
    return this.trackingService.trackPackage(trackingDto);
  }

  @Post('tracking/batch')
  trackMultiplePackages(
    @Body() data: { trackingNumbers: string[] },
  ): Observable<TrackingResponse[]> {
    return this.trackingService.trackMultiplePackages(data.trackingNumbers);
  }

  @Get('tracking/:trackingNumber/history')
  getTrackingHistory(
    @Param('trackingNumber') trackingNumber: string,
  ): Observable<TrackingResponse> {
    return this.trackingService.getTrackingHistory(trackingNumber);
  }

  @Get('tracking/:trackingNumber/status')
  getPackageStatus(
    @Param('trackingNumber') trackingNumber: string,
  ): Observable<{ status: string; location?: string; lastUpdate?: string }> {
    return this.trackingService.getPackageStatus(trackingNumber);
  }

}