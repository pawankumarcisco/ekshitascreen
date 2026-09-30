import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Static storage for local media and thumbnails
  const storageDir = path.resolve(process.cwd(), '../../storage');
  app.use('/storage/media', express.static(path.join(storageDir, 'media')));
  app.use('/storage/thumbnails', express.static(path.join(storageDir, 'thumbnails')));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('EkshitaScreen Local Network Signage API')
    .setDescription('Production Phase 1 API for Android TV signage management and synchronization')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`[EkshitaScreen Backend] running on http://0.0.0.0:${port}`);
  console.log(`[EkshitaScreen Backend] Swagger UI available at http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
