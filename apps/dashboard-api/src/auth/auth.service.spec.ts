
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository, TenantRepository, TeamMemberEntity } from '@lib/database';
import { RbacService } from '../agent-system/rbac.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let tenantRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: TenantRepository,
          useValue: {
            findByUserId: jest.fn(),
            getUserRole: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TeamMemberEntity),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RbacService,
          useValue: {
            getPermissionsForRole: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    tenantRepository = module.get<TenantRepository>(TenantRepository);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should use default expiration if no tenant settings', async () => {
      const user = { id: 'u1', email: 'test@example.com', passwordHash: 'hash' };
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      (tenantRepository.findByUserId as jest.Mock).mockResolvedValue([{ id: 't1', settings: {} }]);
      (tenantRepository.getUserRole as jest.Mock).mockResolvedValue('admin');
      (jwtService.sign as jest.Mock).mockReturnValue('token');
      (jwtService.decode as jest.Mock).mockReturnValue({ exp: 100, iat: 0 });

      await service.login({ email: 'test@example.com', password: 'password' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ expiresIn: '10080m' })
      );
    });

    it('should use configured expiration from tenant settings', async () => {
      const user = { id: 'u1', email: 'test@example.com', passwordHash: 'hash' };
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock) = jest.fn().mockResolvedValue(true);
      
      const settings = { session: { maxDurationMinutes: 60, inactivityTimeoutMinutes: 30 } };
      (tenantRepository.findByUserId as jest.Mock).mockResolvedValue([{ id: 't1', settings }]);
      
      (jwtService.sign as jest.Mock).mockReturnValue('token');
      (jwtService.decode as jest.Mock).mockReturnValue({ exp: 100, iat: 0 });

      await service.login({ email: 'test@example.com', password: 'password' });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ expiresIn: '60m' })
      );
    });
  });
});
