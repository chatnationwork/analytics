/**
 * Assignment engine and rules unit tests.
 * See docs/architecture/assignment_engine_implementation_plan.md (Tests section).
 */

import { AssignmentEngine } from "../src/agent-system/assignment-engine";
import type {
  AssignmentRequest,
  AssignmentContext,
  AssignmentEngineDeps,
} from "../src/agent-system/assignment-engine";
import { scheduleRule } from "../src/agent-system/assignment-engine/rules/schedule.rule";
import { contactAlreadyAssignedRule } from "../src/agent-system/assignment-engine/rules/contact-already-assigned.rule";
import { strategyRule } from "../src/agent-system/assignment-engine/rules/strategy.rule";
import { eligibilityRule } from "../src/agent-system/assignment-engine/rules/eligibility.rule";
import { selectorRule } from "../src/agent-system/assignment-engine/rules/selector.rule";
import { SessionStatus } from "@lib/database";
import type { InboxSessionEntity } from "@lib/database";

function mockSession(
  overrides: Partial<InboxSessionEntity> = {},
): InboxSessionEntity {
  return {
    id: "session-1",
    tenantId: "tenant-1",
    contactId: "contact-1",
    assignedTeamId: "team-1",
    status: SessionStatus.UNASSIGNED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as InboxSessionEntity;
}

function mockRequest(
  overrides: Partial<AssignmentRequest> = {},
): AssignmentRequest {
  return {
    session: mockSession(),
    source: "handover",
    ...overrides,
  };
}

const emptyDeps = {
  sessionRepo: {},
  teamRepo: {},
  memberRepo: {},
  agentRepo: {},
  configRepo: {},
  inboxService: {},
  whatsappService: {},
} as unknown as AssignmentEngineDeps;

describe("AssignmentEngine", () => {
  describe("T1: Engine shell", () => {
    it("returns stop when no rules are registered", async () => {
      const engine = new AssignmentEngine(emptyDeps);
      engine.setRules([]);
      const result = await engine.run(mockRequest());
      expect(result.outcome).toBe("stop");
    });

    it("returns stop when all rules return continue", async () => {
      const engine = new AssignmentEngine(emptyDeps);
      engine.setRules([
        async () => ({ outcome: "continue" as const }),
        async () => ({ outcome: "continue" as const }),
      ]);
      const result = await engine.run(mockRequest());
      expect(result.outcome).toBe("stop");
    });
  });

  describe("T2: ScheduleRule", () => {
    it("returns continue when session has no assignedTeamId", async () => {
      const context: AssignmentContext = {};
      const result = await scheduleRule(
        mockRequest({ session: mockSession({ assignedTeamId: undefined }) }),
        context,
        emptyDeps,
      );
      expect(result.outcome).toBe("continue");
    });

    it("returns continue when checkScheduleAvailability is not provided", async () => {
      const context: AssignmentContext = {};
      const result = await scheduleRule(mockRequest(), context, emptyDeps);
      expect(result.outcome).toBe("continue");
    });

    it("returns continue when team is open", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        checkScheduleAvailability: jest
          .fn()
          .mockResolvedValue({ isOpen: true }),
      } as unknown as AssignmentEngineDeps;
      const result = await scheduleRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("continue");
    });

    it("returns stop when team is closed", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        checkScheduleAvailability: jest.fn().mockResolvedValue({
          isOpen: false,
          nextOpen: new Date(Date.now() + 2 * 60 * 60 * 1000),
          message: "Closed",
        }),
      } as unknown as AssignmentEngineDeps;
      const result = await scheduleRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("stop");
    });
    it("sends image message when mediaUrl is present", async () => {
      const context: AssignmentContext = {};
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const addMessage = jest.fn().mockResolvedValue(undefined);
      
      const deps: AssignmentEngineDeps = {
        checkScheduleAvailability: jest.fn().mockResolvedValue({
          isOpen: false,
          nextOpen: new Date(Date.now() + 25 * 60 * 60 * 1000), // > 24h to trigger OOO
          message: "Closed with image",
          mediaUrl: "http://example.com/image.jpg",
        }),
        whatsappService: { sendMessage },
        inboxService: { addMessage },
        sessionRepo: { update: jest.fn().mockResolvedValue(undefined) },
      } as unknown as AssignmentEngineDeps;
      
      const result = await scheduleRule(mockRequest(), context, deps);
      
      expect(result.outcome).toBe("stop");
      expect(sendMessage).toHaveBeenCalledWith(
        "tenant-1",
        "contact-1",
        {
          type: "image",
          image: { link: "http://example.com/image.jpg", caption: "Closed with image" },
        },
        expect.anything(),
      );
      expect(addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Closed with image",
          attachment: { type: "image", url: "http://example.com/image.jpg" },
        }),
      );
    });
  });

  describe("T3: ContactAlreadyAssignedRule", () => {
    it("returns skip when contact has another assigned session", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        inboxService: {
          contactHasAssignedSession: jest.fn().mockResolvedValue(true),
        },
      } as unknown as AssignmentEngineDeps;
      const result = await contactAlreadyAssignedRule(
        mockRequest(),
        context,
        deps,
      );
      expect(result.outcome).toBe("skip");
    });

    it("returns continue when contact has no assigned session", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        inboxService: {
          contactHasAssignedSession: jest.fn().mockResolvedValue(false),
        },
      } as unknown as AssignmentEngineDeps;
      const result = await contactAlreadyAssignedRule(
        mockRequest(),
        context,
        deps,
      );
      expect(result.outcome).toBe("continue");
    });
  });

  describe("T4: StrategyRule", () => {
    it("returns stop when strategy is manual", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        getStrategyWithType: jest
          .fn()
          .mockResolvedValue({ strategy: "manual" }),
      } as unknown as AssignmentEngineDeps;
      const result = await strategyRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("stop");
    });

    it("returns continue and sets context when strategy is round_robin", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        getStrategyWithType: jest.fn().mockResolvedValue({
          strategy: "round_robin",
          config: { sortBy: "name" },
        }),
      } as unknown as AssignmentEngineDeps;
      const result = await strategyRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("continue");
      expect(context.strategy).toBe("round_robin");
      expect(context.config).toEqual({ sortBy: "name" });
    });

    it("returns continue when getStrategyWithType is not provided", async () => {
      const context: AssignmentContext = {};
      const result = await strategyRule(mockRequest(), context, emptyDeps);
      expect(result.outcome).toBe("continue");
    });
  });

  describe("T5: EligibilityRule + NoAgentRule", () => {
    it("returns stop and runs no-agent when no agents available", async () => {
      const context: AssignmentContext = {};
      const runNoAgent = jest.fn().mockResolvedValue(undefined);
      const deps: AssignmentEngineDeps = {
        getAvailableAgents: jest.fn().mockResolvedValue([]),
        runNoAgentFallback: runNoAgent,
      } as unknown as AssignmentEngineDeps;
      const result = await eligibilityRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("stop");
      expect(runNoAgent).toHaveBeenCalledWith(
        expect.objectContaining({ id: "session-1" }),
      );
    });

    it("returns continue and sets context.agents when agents available", async () => {
      const context: AssignmentContext = {};
      const deps: AssignmentEngineDeps = {
        getAvailableAgents: jest.fn().mockResolvedValue(["agent-1", "agent-2"]),
      } as unknown as AssignmentEngineDeps;
      const result = await eligibilityRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("continue");
      expect(context.agents).toEqual(["agent-1", "agent-2"]);
    });
  });

  describe("T6: SelectorRule", () => {
    it("returns assign with agentId when pickAgentForSession returns id", async () => {
      const context: AssignmentContext = {
        strategy: "round_robin",
        agents: ["agent-1", "agent-2"],
      };
      const deps: AssignmentEngineDeps = {
        pickAgentForSession: jest.fn().mockResolvedValue("agent-1"),
      } as unknown as AssignmentEngineDeps;
      const result = await selectorRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("assign");
      expect((result as { outcome: "assign"; agentId: string }).agentId).toBe(
        "agent-1",
      );
    });

    it("returns stop and runs no-agent when pickAgentForSession returns null", async () => {
      const context: AssignmentContext = {
        strategy: "round_robin",
        agents: [],
      };
      const runNoAgent = jest.fn().mockResolvedValue(undefined);
      const deps: AssignmentEngineDeps = {
        pickAgentForSession: jest.fn().mockResolvedValue(null),
        runNoAgentFallback: runNoAgent,
      } as unknown as AssignmentEngineDeps;
      const result = await selectorRule(mockRequest(), context, deps);
      expect(result.outcome).toBe("stop");
      expect(runNoAgent).toHaveBeenCalled();
    });
  });

  describe("T7: Queue path (source)", () => {
    it("engine run with source queue uses same pipeline (schedule can stop)", async () => {
      const deps: AssignmentEngineDeps = {
        ...emptyDeps,
        checkScheduleAvailability: jest.fn().mockResolvedValue({
          isOpen: false,
          nextOpen: new Date(Date.now() + 48 * 60 * 60 * 1000),
          message: "Closed",
        }),
        whatsappService: {
          sendMessage: jest.fn().mockResolvedValue(undefined),
        },
        inboxService: { addMessage: jest.fn().mockResolvedValue(undefined) },
        sessionRepo: { update: jest.fn().mockResolvedValue(undefined) },
      } as unknown as AssignmentEngineDeps;
      const engine = new AssignmentEngine(deps);
      engine.setRules([scheduleRule]);
      const result = await engine.run(mockRequest({ source: "queue" }));
      expect(result.outcome).toBe("stop");
    });
  });

  describe("T8: Error outcome", () => {
    it("pipeline returns error when a rule returns error", async () => {
      const errorRule = async () => ({
        outcome: "error" as const,
        message: "Test error",
      });
      const engine = new AssignmentEngine(emptyDeps);
      engine.setRules([errorRule]);
      const result = await engine.run(mockRequest());
      expect(result.outcome).toBe("error");
      expect((result as { outcome: "error"; message: string }).message).toBe(
        "Test error",
      );
    });

    it("first non-continue result stops pipeline (error)", async () => {
      const engine = new AssignmentEngine(emptyDeps);
      engine.setRules([
        async () => ({ outcome: "continue" as const }),
        async () => ({ outcome: "error" as const, message: "Fail" }),
        async () => ({ outcome: "assign" as const, agentId: "agent-1" }),
      ]);
      const result = await engine.run(mockRequest());
      expect(result.outcome).toBe("error");
    });
  });
});
