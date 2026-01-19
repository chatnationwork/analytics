import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { DashboardModule } from '../src/dashboard.module';
import { ValidationPipe } from '@nestjs/common';
import * as crypto from 'crypto';

describe('Dashboard API (e2e)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  let tenantId: string;
  let crmIntegrationId: string;
  let apiKeyId: string;

  const uniqueSuffix = crypto.randomBytes(4).toString('hex');
  const testUser = {
    email: `e2e_${uniqueSuffix}@example.com`,
    password: 'Password123!',
    name: 'E2E User',
    organizationName: `E2E Org ${uniqueSuffix}`,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DashboardModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    
    // Replicate main.ts configuration
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30000); // 30s timeout for DB connection

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('/auth/signup (POST)', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(201)
        .then((res: request.Response) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('id');
          accessToken = res.body.accessToken;
        });
    });

    it('/auth/login (POST)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200)
        .then((res: request.Response) => {
          expect(res.body).toHaveProperty('accessToken');
          if (!accessToken) accessToken = res.body.accessToken;
        });
    });

    it('/auth/me (GET)', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res: request.Response) => {
          expect(res.body.email).toBe(testUser.email);
        });
    });
  });

  describe('Tenants', () => {
    it('/tenants (GET)', () => {
      return request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          tenantId = res.body[0].id;
        });
    });

    it('/tenants/current (GET)', () => {
      return request(app.getHttpServer())
        .get('/tenants/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res: request.Response) => {
          expect(res.body.tenantId).toBe(tenantId);
          expect(res.body.slug).toBeDefined();
        });
    });
  });

  describe('CRM Integrations', () => {
    it('/crm-integrations (POST)', () => {
      console.log('Creating CRM Integration...');
      return request(app.getHttpServer())
        .post('/crm-integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'E2E CRM',
          apiUrl: 'https://crm.e2e.test',
          apiKey: 'e2e_api_key',
        })
        .expect(201)
        .then((res: request.Response) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('E2E CRM');
          crmIntegrationId = res.body.id;
        });
    });

    it('/crm-integrations (GET)', () => {
      return request(app.getHttpServer())
        .get('/crm-integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          const created = res.body.find((i: any) => i.id === crmIntegrationId);
          expect(created).toBeDefined();
        });
    });
  });

  describe('API Keys', () => {
    it('/api-keys (POST)', () => {
      console.log('Generating API Key...');
      return request(app.getHttpServer())
        .post('/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Key', type: 'write' })
        .expect(201)
        .then((res: request.Response) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('key');
          expect(res.body.key).toContain('wk_');
          apiKeyId = res.body.id;
        });
    });

    it('/api-keys (GET)', () => {
      return request(app.getHttpServer())
        .get('/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          const created = res.body.find((k: any) => k.id === apiKeyId);
          expect(created).toBeDefined();
          expect(created.key).toBeUndefined(); // Key should not be returned in list
        });
    });

    it('/api-keys/:id (DELETE)', () => {
      return request(app.getHttpServer())
        .delete(`/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });

  describe('Cleanup', () => {
    it('/crm-integrations/:id (DELETE)', () => {
      return request(app.getHttpServer())
        .delete(`/crm-integrations/${crmIntegrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });
});
