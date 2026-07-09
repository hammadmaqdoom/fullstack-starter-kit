import { AuthGuard } from '@/auth/auth.guard';
import { RbacGuard } from '@/auth/guards/rbac.guard';
import { WorkerController } from '../src/modules/core-hr/worker.controller';
import { WorkerService } from '../src/modules/core-hr/worker.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { ScopeType } from '@/modules/compliance/enums/scope-type.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { RowScopeService } from '@/shared/scope/row-scope.service';
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
import request from 'supertest';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { ApiEnvelopeInterceptor } from '../src/shared/interceptors/api-envelope.interceptor';
import { WorkMode } from '../src/modules/core-hr/enums/worker.enum';

const FULL_TIME_TYPE_ID = 'c0000000-0000-4000-8000-000000000001';

@Module({
  controllers: [WorkerController],
  providers: [
    RowScopeService,
    {
      provide: WorkerService,
      useValue: {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
      },
    },
    {
      provide: RbacService,
      useValue: {
        getAuthContext: jest.fn(),
      },
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
class WorkersV1TestModule {}

describe('Workers (e2e)', () => {
  let app: NestFastifyApplication;
  let workerService: {
    create: jest.Mock;
    findAll: jest.Mock;
  };
  let rbacService: { getAuthContext: jest.Mock };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WorkersV1TestModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { session: unknown } };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.session = {
            user: { id: 'test-user-id', email: 'ops@digitaro.com' },
          };
          return true;
        },
      })
      .compile();

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

    app.getHttpAdapter().getInstance().addHook('onRequest', async (request) => {
      (request as { session?: { user: { id: string; email: string } } }).session =
        {
          user: { id: 'test-user-id', email: 'ops@digitaro.com' },
        };
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    workerService = moduleFixture.get(WorkerService);
    rbacService = moduleFixture.get(RbacService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/workers creates worker with envelope', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: 'tenant-id',
      userId: 'test-user-id',
      roleCodes: [PolarisRoleCode.PEOPLE_OPS],
      assignments: [
        {
          roleId: 'role-id',
          roleCode: PolarisRoleCode.PEOPLE_OPS,
          scopeType: ScopeType.ALL,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.ALL,
    });

    workerService.create.mockResolvedValue({
      id: 'w0000000-0000-4000-8000-000000000001',
      email: 'ayesha.khan@digitaro.com',
      firstName: 'Ayesha',
      lastName: 'Khan',
      countryCode: 'PK',
      statutoryFields: { cnic: '35202-1234567-1' },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/workers')
      .set('x-correlation-id', 'corr-e2e-1')
      .send({
        employmentTypeId: FULL_TIME_TYPE_ID,
        countryCode: 'PK',
        firstName: 'Ayesha',
        lastName: 'Khan',
        email: 'ayesha.khan@digitaro.com',
        startDate: '2026-04-01',
        workMode: WorkMode.HYBRID,
        statutoryFields: {
          cnic: '35202-1234567-1',
          ntn: '1234567-8',
          eobi_number: 'EOBI-001',
        },
      })
      .expect(201);

    expect(response.body.data.email).toBe('ayesha.khan@digitaro.com');
    expect(response.body.errors).toEqual([]);
    expect(workerService.create).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'PK' }),
      'test-user-id',
      'corr-e2e-1',
      expect.any(String),
    );
  });

  it('GET /api/v1/workers returns 403 for employee role', async () => {
    rbacService.getAuthContext.mockResolvedValue({
      tenantId: 'tenant-id',
      userId: 'employee-user-id',
      roleCodes: [PolarisRoleCode.EMPLOYEE],
      assignments: [
        {
          roleId: 'role-id',
          roleCode: PolarisRoleCode.EMPLOYEE,
          scopeType: ScopeType.OWN,
          scopeId: null,
        },
      ],
      broadestScope: ScopeType.OWN,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/workers')
      .expect(403);

    expect(response.body.errors[0].code).toBe('FORBIDDEN');
    expect(workerService.findAll).not.toHaveBeenCalled();
  });
});
