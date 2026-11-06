import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Shared app configuration: used by main.ts and by e2e tests. */
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Cinema Booking API')
    .setDescription(
      'Фільми, зали, сеанси та бронювання місць (PostgreSQL + TypeORM)',
    )
    .setVersion('2.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
