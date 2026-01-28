
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { TenantRepository } from '@lib/database';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: any;
  let tenantRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('secret'),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
        {
          provide: TenantRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get<AuthService>(AuthService);
    tenantRepository = module.get<TenantRepository>(TenantRepository);
  });

  describe('validate', () => {
    it('should validate user and return successfully if no revocation exists', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      authService.validateUser.mockResolvedValue(user);
      tenantRepository.findByUserId.mockResolvedValue([{ id: 't1', settings: {} }]);

      const result = await strategy.validate({ sub: 'u1', email: 'test@example.com', iat: 1000 });

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if token was issued before revocation', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      authService.validateUser.mockResolvedValue(user);
      
      const revokedAt = new Date('2026-01-28T12:00:00Z');
      const settings = { session: { sessionsRevokedAt: revokedAt.toISOString() } };
      tenantRepository.findByUserId.mockResolvedValue([{ id: 't1', settings }]);

      // iat is 11:00:00 AM (older than revocation)
      const payload = { sub: 'u1', email: 'test@example.com', iat: revokedAt.getTime() / 1000 - 3600 };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed if token was issued after revocation', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      authService.validateUser.mockResolvedValue(user);
      
      const revokedAt = new Date('2026-01-28T12:00:00Z');
      const settings = { session: { sessionsRevokedAt: revokedAt.toISOString() } };
      tenantRepository.findByUserId.mockResolvedValue([{ id: 't1', settings }]);

      // iat is 1:00:00 PM (newer than revocation)
      const payload = { sub: 'u1', email: 'test@example.com', iat: revokedAt.getTime() / 1000 + 3600 };

      const result = await strategy.validate(payload);
      expect(result).toEqual(user);
    });
  });
});
