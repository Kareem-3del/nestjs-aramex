import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class TrackingDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @IsOptional()
  @IsBoolean()
  getLastTrackingUpdateOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  useSoap?: boolean;
}

export class BatchTrackingDto {
  @IsArray()
  @IsString({ each: true })
  trackingNumbers: string[];

  @IsOptional()
  @IsBoolean()
  getLastTrackingUpdateOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  useSoap?: boolean;
}