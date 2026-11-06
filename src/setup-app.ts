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
      'Фільми, зали, сеанси та бронювання місць (MongoDB + Mongoose). ' +
        'Усі ідентифікатори — ObjectId: рядок із 24 шістнадцяткових символів; ' +
        'інший формат дає 400 ще до звернення до бази.',
    )
    .setVersion('3.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
