import { EntraAuthController } from '../src/auth/entra/entra-auth.controller';
import { EntraStrategy } from '../src/auth/entra/entra.strategy';
import { ContractorAuthController } from '../src/auth/contractor/contractor-auth.controller';
import { ContractorAuthService } from '../src/auth/contractor/contractor-auth.service';
import {
  ClassSerializerInterceptor,
  Module,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { ApiEnvelopeInterceptor } from '../src/shared/interceptors/api-envelope.interceptor';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 900, limit: 5 }])],
  controllers: [EntraAuthController, ContractorAuthController],
  providers: [
    {
      provide: EntraStrategy,
      useValue: {
        isConfigured: () => true,
        getSignInRedirectUrl: async () =>
          'https://login.microsoftonline.com/mock-authorize',
        handleCallback: async () =>
          new Response(null, {
            status: 302,
            headers: { Location: 'http://localhost:3000/dashboard' },
          }),
      },
    },
    {
      provide: ContractorAuthService,
      useValue: {
        signInWithEmail: async () => ({ token: 'mock-token' }),
        sendMagicLink: async () => ({ sent: true }),
      },
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class AuthV1TestModule {}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthV1TestModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 422,
      }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(reflector),
      new ApiEnvelopeInterceptor(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/auth/entra/login redirects to Microsoft', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/entra/login')
      .expect(302);

    expect(response.headers.location).toBe(
      'https://login.microsoftonline.com/mock-authorize',
    );
  });

  it('GET /api/v1/auth/entra/callback forwards OAuth callback', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/entra/callback?code=mock-code&state=mock-state')
      .expect(302);

    expect(response.headers.location).toBe('http://localhost:3000/dashboard');
  });

  it('POST /api/v1/auth/contractor/login validates request body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/contractor/login')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(422);

    expect(response.body).toMatchObject({
      data: null,
      errors: expect.any(Array),
    });
  });

  it('POST /api/v1/auth/contractor/login returns enveloped session token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/contractor/login')
      .send({ email: 'contractor@example.com', password: 'password123' })
      .expect(201);

    expect(response.body).toEqual({
      data: { token: 'mock-token' },
      meta: {},
      errors: [],
    });
  });
});
