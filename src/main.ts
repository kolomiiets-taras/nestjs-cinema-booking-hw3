import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/environment-variables';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(
    `Server: http://localhost:${port}, Swagger: http://localhost:${port}/docs`,
  );
}
void bootstrap();
