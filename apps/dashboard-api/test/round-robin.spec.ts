
import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from '../src/agent-system/assignment.service';
import { InboxService } from '../src/agent-system/inbox.service';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { 
    InboxSessionEntity, 
    TeamEntity, 
    TeamMemberEntity, 
    AgentProfileEntity, 
    AssignmentConfigEntity, 
    TenantMembershipEntity,
    SessionStatus
} from '@lib/database';
import { Repository } from 'typeorm';

// Mock Data
const MOCK_TENANT = 'tenant_123';
const MOCK_TEAM = 'team_abc';
const AGENT_IDS = ['agent_1', 'agent_2', 'agent_3'];

describe('Round Robin Assignment Test', () => {
  let service: AssignmentService;
  let sessionRepo: Repository<InboxSessionEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        {
          provide: WhatsappService,
          useValue: { sendMessage: jest.fn() },
        },
        {
          provide: InboxService,
          useValue: { addMessage: jest.fn() },
        },
        // MOCK REPOSITORIES
        {
          provide: getRepositoryToken(InboxSessionEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TeamEntity),
          useValue: {
             findOne: jest.fn().mockResolvedValue({ 
                 id: MOCK_TEAM, 
                 routingStrategy: 'round_robin',
                 routingConfig: { sortBy: 'name' }
             }),
          },
        },
        {
          provide: getRepositoryToken(TeamMemberEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(AgentProfileEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(AssignmentConfigEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(TenantMembershipEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
    sessionRepo = module.get(getRepositoryToken(InboxSessionEntity));

    // Mock the "getAvailableAgents" private method or its dependencies?
    // Since getAvailableAgents is private, we should mock the repositories it uses.
    // It calls memberRepo.find (for team) or tenantMembershipRepo.find (for roles).
    
    // We'll mock it passing the "team" check
    const memberRepo = module.get(getRepositoryToken(TeamMemberEntity));
    jest.spyOn(memberRepo, 'find').mockResolvedValue(
        AGENT_IDS.map(id => ({ userId: id } as any))
    );
    
    // Mock getAgentDetails for sorting
    // It queries via memberRepo query builder
    const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(
            AGENT_IDS.map(id => ({ 
                userId: id, 
                user: { name: `Agent ${id}`, createdAt: new Date() } 
            }))
        ),
    };
    jest.spyOn(memberRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

    // Mock Config Repo for "getAvailableAgents" waterfall config
    const configRepo = module.get(getRepositoryToken(AssignmentConfigEntity));
    jest.spyOn(configRepo, 'findOne').mockResolvedValue({
        settings: { waterfall: { levels: ['team'] } }
    } as any);

    // Mock Session Save
    jest.spyOn(sessionRepo, 'save').mockImplementation(async (session) => session as any);
  });

  it('jould assign agents in a strict rotation (1 -> 2 -> 3 -> 1)', async () => {
    const results = [];

    console.log('\n--- Starting Round Robin Simulation ---');
    console.log(`Agents: ${AGENT_IDS.join(', ')}`);

    for (let i = 0; i < 6; i++) {
        const session = {
            id: `session_${i}`,
            tenantId: MOCK_TENANT,
            assignedTeamId: MOCK_TEAM,
            status: SessionStatus.UNASSIGNED,
        } as InboxSessionEntity;

        const assigned = await service.assignSession(session);
        console.log(`[Session ${i}] Assigned to: ${assigned?.assignedAgentId}`);
        results.push(assigned?.assignedAgentId);
    }
    
    console.log('--- Simulation Complete ---\n');

    expect(results[0]).toBe('agent_1');
    expect(results[1]).toBe('agent_2');
    expect(results[2]).toBe('agent_3');
    expect(results[3]).toBe('agent_1');
    expect(results[4]).toBe('agent_2');
    expect(results[5]).toBe('agent_3');
  });
});
