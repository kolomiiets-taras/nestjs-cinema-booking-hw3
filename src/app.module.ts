import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables, validate } from './config/environment-variables';
import { FilmsModule } from './films/films.module';
import { HallsModule } from './halls/halls.module';
import { ShowingsModule } from './showings/showings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        type: 'postgres',
        uuidExtension: 'pgcrypto',
        host: config.get('POSTGRES_HOST', { infer: true }),
        port: config.get('POSTGRES_PORT', { infer: true }),
        username: config.get('POSTGRES_USER', { infer: true }),
        password: config.get('POSTGRES_PASSWORD', { infer: true }),
        database: config.get('POSTGRES_DB', { infer: true }),
        autoLoadEntities: true,
        // The schema is created and changed by migrations only.
        synchronize: false,
      }),
    }),
    FilmsModule,
    HallsModule,
    ShowingsModule,
  ],
})
export class AppModule {}
