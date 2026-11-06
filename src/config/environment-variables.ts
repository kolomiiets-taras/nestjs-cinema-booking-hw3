import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment;

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;
}

/**
 * Called by ConfigModule on startup (and by the TypeORM CLI data source):
 * the application does not start when a variable is missing or invalid.
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
