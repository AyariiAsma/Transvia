import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const apiPrefix = 'api/v1';
  const isProduction = config.get('NODE_ENV') === 'production';

  // ─── Sécurité ───────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: isProduction
        ? undefined
        : false, // désactiver en dev pour Swagger
    }),
  );
  app.use(compression());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: isProduction
      ? config.get<string>('CORS_ORIGINS', '').split(',')
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ─── Versioning & Préfixe ───────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning();

  // ─── WebSocket Adapter ──────────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // ─── Pipes globaux ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Filters & Interceptors globaux ─────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ─── Swagger (dev uniquement) ────────────────────────────────────────────────
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LogisticApp API')
      .setDescription('API complète de la plateforme de transport & livraison à la demande')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT',
      )
      .addTag('auth', 'Authentification & gestion des tokens')
      .addTag('rides', 'Courses — booking, dispatch, suivi')
      .addTag('driver', 'Espace chauffeur')
      .addTag('users', 'Profil utilisateur & wallet')
      .addTag('geo', 'Géolocalisation — OSRM + Google Places')
      .addTag('payments', 'Paiements & transactions')
      .addTag('admin', 'Administration')
      .addServer(`http://localhost:${port}`, 'Développement local')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });

    logger.log(`📚 Swagger: http://localhost:${port}/${apiPrefix}/docs`);
  }

  // ─── Shutdown hooks ─────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 API démarrée sur: http://localhost:${port}/${apiPrefix}`);
  logger.log(`🌍 Environnement: ${config.get('NODE_ENV', 'development')}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Erreur au démarrage:', err);
  process.exit(1);
});
