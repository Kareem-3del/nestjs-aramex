import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingLocationDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class ShippingDimensionsDto {
  @IsNumber()
  @IsPositive()
  length: number;

  @IsNumber()
  @IsPositive()
  width: number;

  @IsNumber()
  @IsPositive()
  height: number;

  @IsNumber()
  @IsPositive()
  weight: number;

  @IsOptional()
  @IsIn(['kg', 'lb'])
  unit?: 'kg' | 'lb' = 'kg';

  @IsOptional()
  @IsIn(['cm', 'in'])
  dimensionUnit?: 'cm' | 'in' = 'cm';
}

export class ShippingSearchDto {
  @ValidateNested()
  @Type(() => ShippingLocationDto)
  origin: ShippingLocationDto;

  @ValidateNested()
  @Type(() => ShippingLocationDto)
  destination: ShippingLocationDto;

  @ValidateNested()
  @Type(() => ShippingDimensionsDto)
  packageDetails: ShippingDimensionsDto;

  @IsOptional()
  @IsIn(['EXP', 'DOM', 'PDX', 'PPX', 'GND'])
  serviceType?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsIn(['P', 'C', '3']) // P=Prepaid, C=Collect, 3=Third Party
  paymentType?: string;

  @IsOptional()
  @IsString()
  descriptionOfGoods?: string;
}