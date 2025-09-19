import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, validateSync } from 'class-validator';
import { Transform, Type, plainToClass } from 'class-transformer';
import { AramexConfig } from '../interfaces/aramex-config.interface';

export class AramexConfigValidator implements AramexConfig {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountPin: string;

  @IsString()
  @IsNotEmpty()
  accountEntity: string;

  @IsString()
  @IsNotEmpty()
  accountCountryCode: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  }, { toClassOnly: true })
  sandbox?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  }, { toClassOnly: true })
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  }, { toClassOnly: true })
  debug?: boolean;
}

export function validateAramexConfig(config: Partial<AramexConfig>): AramexConfig {
  const validatorInstance = plainToClass(AramexConfigValidator, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatorInstance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Aramex configuration validation failed: ${errorMessages}`);
  }

  return validatorInstance;
}

export function createConfigFromEnvironment(): AramexConfig {
  const config: Partial<AramexConfig> = {
    username: process.env.ARAMEX_USERNAME,
    password: process.env.ARAMEX_PASSWORD,
    accountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
    accountPin: process.env.ARAMEX_ACCOUNT_PIN,
    accountEntity: process.env.ARAMEX_ACCOUNT_ENTITY,
    accountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE,
    sandbox: process.env.ARAMEX_SANDBOX !== undefined ? process.env.ARAMEX_SANDBOX.toLowerCase() === 'true' : undefined,
    timeout: process.env.ARAMEX_TIMEOUT ? parseInt(process.env.ARAMEX_TIMEOUT, 10) : undefined,
    debug: process.env.ARAMEX_DEBUG !== undefined ? process.env.ARAMEX_DEBUG.toLowerCase() === 'true' : undefined,
  };

  return validateAramexConfig(config);
}