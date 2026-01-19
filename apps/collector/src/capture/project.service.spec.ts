import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { ApiKeyRepository } from '@lib/database';
import * as crypto from 'crypto';

// Mock ApiKeyRepository
const mockApiKeyRepository = {
  findByHash: jest.fn(),
  updateLastUsed: jest.fn().mockResolvedValue(undefined),
};

describe('ProjectService', () => {
  let service: ProjectService;
  let repository: typeof mockApiKeyRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ApiKeyRepository,
          useValue: mockApiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    repository = module.get(ApiKeyRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByWriteKey', () => {
    it('should return project for valid write key', async () => {
      const writeKey = 'wk_valid123';
      const hash = crypto.createHash('sha256').update(writeKey).digest('hex');
      
      const mockKey = {
        id: 'key-123',
        keyHash: hash,
        type: 'write',
        isActive: true,
        projectId: 'proj-123',
        tenantId: 'tenant-123',
      };

      repository.findByHash.mockResolvedValue(mockKey);

      const result = await service.findByWriteKey(writeKey);

      expect(repository.findByHash).toHaveBeenCalledWith(hash);
      expect(result).toEqual({
        projectId: 'proj-123',
        tenantId: 'tenant-123',
        writeKey,
        allowedOrigins: ['*'],
      });
      expect(repository.updateLastUsed).toHaveBeenCalledWith('key-123');
    });

    it('should return null for invalid write key (not found)', async () => {
      repository.findByHash.mockResolvedValue(null);

      const result = await service.findByWriteKey('invalid_key');
      expect(result).toBeNull();
    });

    it('should return null for inactive key', async () => {
      const writeKey = 'wk_inactive';
      const hash = crypto.createHash('sha256').update(writeKey).digest('hex');
      
      repository.findByHash.mockResolvedValue({
        id: 'key-123',
        keyHash: hash,
        type: 'write',
        isActive: false, // Inactive
        tenantId: 'tenant-123',
      });

      const result = await service.findByWriteKey(writeKey);
      expect(result).toBeNull();
    });

    it('should return null for read-only key used as write key', async () => {
      const writeKey = 'wk_read';
      const hash = crypto.createHash('sha256').update(writeKey).digest('hex');
      
      repository.findByHash.mockResolvedValue({
        id: 'key-123',
        keyHash: hash,
        type: 'read', // Wrong type
        isActive: true,
        tenantId: 'tenant-123',
      });

      const result = await service.findByWriteKey(writeKey);
      expect(result).toBeNull();
    });
    
    it('should handle default projectId if missing', async () => {
        const writeKey = 'wk_no_project';
        const hash = crypto.createHash('sha256').update(writeKey).digest('hex');
        
        const mockKey = {
          id: 'key-123',
          keyHash: hash,
          type: 'write',
          isActive: true,
          projectId: null, // Missing
          tenantId: 'tenant-123',
        };
  
        repository.findByHash.mockResolvedValue(mockKey);
  
        const result = await service.findByWriteKey(writeKey);
  
        expect(result).toEqual({
          projectId: 'default', // Fallback
          tenantId: 'tenant-123',
          writeKey,
          allowedOrigins: ['*'],
        });
      });
  });
});
