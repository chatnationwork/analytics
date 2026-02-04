import { Test, TestingModule } from "@nestjs/testing";
import { AssignmentService } from "../src/agent-system/assignment.service";
import { InboxService } from "../src/agent-system/inbox.service";
import { WhatsappService } from "../src/whatsapp/whatsapp.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  ROUND_ROBIN_CONTEXT_PROVIDER,
  InMemoryRoundRobinContextProvider,
} from "../src/agent-system/assignment-engine";
import {
  InboxSessionEntity,
  TeamEntity,
  TeamMemberEntity,
  AgentProfileEntity,
  AssignmentConfigEntity,
  TenantMembershipEntity,
  SessionStatus,
  MembershipRole,
  TenantEntity,
} from "@lib/database";
import { Repository } from "typeorm";

// Mock Data
const MOCK_TENANT = "tenant_123";
const AGENT_MEMBER = "agent_member";
const AGENT_ADMIN = "agent_admin";
const AGENT_CUSTOM = "agent_custom_role";

describe("Tenant Level Routing Test", () => {
  let service: AssignmentService;
  let tenantMembershipRepo: Repository<TenantMembershipEntity>;
  let configRepo: Repository<AssignmentConfigEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ROUND_ROBIN_CONTEXT_PROVIDER,
          useClass: InMemoryRoundRobinContextProvider,
        },
        AssignmentService,
        { provide: WhatsappService, useValue: { sendMessage: jest.fn() } },
        { provide: InboxService, useValue: { addMessage: jest.fn() } },
        {
          provide: getRepositoryToken(InboxSessionEntity),
          useValue: { save: jest.fn((s) => s), findOneOrFail: jest.fn() },
        },
        { provide: getRepositoryToken(TeamEntity), useClass: Repository },
        { provide: getRepositoryToken(TeamMemberEntity), useClass: Repository },
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
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
    tenantMembershipRepo = module.get(
      getRepositoryToken(TenantMembershipEntity),
    );
    configRepo = module.get(getRepositoryToken(AssignmentConfigEntity));

    // Mock Config: Default Waterfall (team, member, admin, super_admin)
    jest.spyOn(configRepo, "findOne").mockResolvedValue({
      settings: { waterfall: { levels: ["member", "admin"] } }, // Explicitly testing these
    } as any);

    // Mock Tenant Memberships
    jest
      .spyOn(tenantMembershipRepo, "find")
      .mockImplementation(async ({ where }: any) => {
        if (where.role === "member") return [{ userId: AGENT_MEMBER }] as any;
        if (where.role === "admin") return [{ userId: AGENT_ADMIN }] as any;
        return [];
      });
  });

  it("should find agents with MEMBER role when no Team ID is provided", async () => {
    console.log("\n--- Testing Tenant Routing (MEMBER) ---");

    const session = {
      id: "session_no_team_1",
      tenantId: MOCK_TENANT,
      assignedTeamId: null, // crucial
      status: SessionStatus.UNASSIGNED,
    } as any;

    // Spy on private method if possible, or just check result
    // We can check if assignRoundRobin finds agents

    // We mock memberRepo to return empty for team (since no teamId, it skips team check anyway)
    // The service should hit tenantMembershipRepo for 'member'

    // We need to mock getAgentDetails to avoid crash
    // mocking it privately is hard in Jest without casting to any
    (service as any).getAgentDetails = jest
      .fn()
      .mockResolvedValue([
        { id: AGENT_MEMBER, name: "Member Agent", createdAt: new Date() },
      ]);

    const result = await service.assignSession(session);

    console.log(`Assigned Agent: ${result?.assignedAgentId}`);
    expect(result?.assignedAgentId).toBe(AGENT_MEMBER);
  });
});
