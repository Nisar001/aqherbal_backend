import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps the original bytes on req.rawBody so the Razorpay
  // webhook can verify the HMAC signature (see RazorpayWebhookController).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);

  app.use(helmet());

  // DTO validation: strip unknown fields, coerce query params, whitelist
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );
  const adminUrl = configService.get<string>(
    'ADMIN_URL',
    'http://localhost:3001',
  );
  app.enableCors({
    origin: [frontendUrl, adminUrl],
    credentials: true,
  });

  // Both frontends call /api/v1/...
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs-json', 'api/health'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AQ Herbal API')
    .setDescription(
      'Shared backend for the AQ Herbal storefront and admin panel. ' +
        'Phase 1: Auth & User Management. Phase 2: Product Catalog & Inventory.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('PORT', 5000);
  await app.listen(port);

  console.log(`AQ Herbal API running on http://localhost:${port}/api/v1`);

  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
