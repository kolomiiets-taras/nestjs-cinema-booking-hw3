import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  Matches,
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

  /** e.g. mongodb://user:password@localhost:27017/cinema?authSource=admin */
  @IsString()
  @Matches(/^mongodb(\+srv)?:\/\/\S+$/, {
    message:
      'MONGODB_URI must be a MongoDB connection string (mongodb://... or mongodb+srv://...)',
  })
  MONGODB_URI: string;
}

/**
 * Called by ConfigModule on startup (the seed script boots the same module):
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
