import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/modules/prisma/prisma.service';

/**
 * Tests d'intégration Auth — nécessitent une vraie DB de test
 * Lancer avec: DATABASE_URL=postgresql://test:test@localhost:5432/logistic_test npm run test:e2e
 */
describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdUserId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (createdUserId) {
      await prisma.user.deleteMany({
        where: { id: createdUserId },
      });
    }
    await app.close();
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('200: devrait créer un compte client', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+21699000099',
          email: 'integration-test@logisticapp.com',
          password: 'TestPass@123',
          firstName: 'Test',
          lastName: 'Integration',
          role: 'CLIENT',
          countryCode: '+216',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.email).toBe('integration-test@logisticapp.com');

      createdUserId = res.body.data.user.id;
      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('409: devrait rejeter un téléphone déjà utilisé', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+21699000099', // Même téléphone
          password: 'TestPass@123',
          firstName: 'Dup',
          lastName: 'Dup',
          role: 'CLIENT',
          countryCode: '+216',
        });

      expect(res.status).toBe(409);
    });

    it('400: devrait rejeter un mot de passe faible', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          phone: '+21699000088',
          password: 'weak', // Pas de majuscule ni chiffre
          firstName: 'Test',
          lastName: 'Weak',
          role: 'CLIENT',
          countryCode: '+216',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('200: devrait se connecter avec email + mot de passe', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'integration-test@logisticapp.com',
          password: 'TestPass@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('401: devrait rejeter un mauvais mot de passe', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'integration-test@logisticapp.com',
          password: 'WrongPass@999',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /me ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('200: devrait retourner le profil avec un token valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('integration-test@logisticapp.com');
    });

    it('401: devrait rejeter sans token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('200: devrait émettre un nouveau access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('401: devrait rejeter un refresh token invalide', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Password Reset ────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/password/reset-request', () => {
    it('200: devrait toujours retourner succès (anti-énumération)', async () => {
      const resExists = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'integration-test@logisticapp.com' });

      const resNotExists = await request(app.getHttpServer())
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'nonexistent@test.com' });

      expect(resExists.status).toBe(200);
      expect(resNotExists.status).toBe(200);
      // Les deux réponses doivent être identiques (anti-timing-attack)
      expect(resExists.body.data.message).toBe(resNotExists.body.data.message);
    });
  });
});
