import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { extractDataBody } from './helpers/response.helper';

/**
 * FIX-P0-005 GREEN Phase: 验证全局 /v1/ 前缀配置已修复
 * 
 * 契约要求：
 * - api.base_path: "/v1"
 * - 所有资源端点必须添加 /v1/ 前缀
 * 
 * GREEN 阶段目标：
 * - 在测试中正确配置 setGlobalPrefix('v1')
 * - 验证 /v1/* 路由正常工作
 */
describe('FIX-P0-005: Global /v1/ prefix validation (GREEN)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // GREEN 阶段：正确配置全局前缀，与 main.ts 保持一致
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global prefix validation (GREEN)', () => {
    it('should return 404 for /health without v1 prefix (prefix is active)', async () => {
      // GREEN 阶段：由于配置了 setGlobalPrefix('v1')，/health 应该返回 404
      const res = await request(app.getHttpServer()).get('/health');
      
      console.log('[GREEN] /health status:', res.status);
      
      expect(res.status).toBe(404);
    });

    it('should return 200 for /v1/health when global prefix IS configured', async () => {
      // GREEN 阶段：配置了 setGlobalPrefix('v1') 后，/v1/health 应该正常返回 200
      const res = await request(app.getHttpServer()).get('/v1/health');
      
      console.log('[GREEN] /v1/health status:', res.status);
      
      expect(res.status).toBe(200);
    });

    it('should confirm /v1/health returns healthy status', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health');
      
      expect(res.status).toBe(200);
      expect(extractDataBody(res)).toHaveProperty('status', 'ok');
      expect(extractDataBody(res)).toHaveProperty('timestamp');
    });
  });
});

