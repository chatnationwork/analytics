import { Test, TestingModule } from "@nestjs/testing";
import { WhatsappService } from "./whatsapp.service";
import { CrmIntegrationsService } from "../crm-integrations/crm-integrations.service";
import { SystemMessagesService } from "../system-messages/system-messages.service";
import { AuditLogRepository } from "@lib/database";

describe("WhatsappService", () => {
  let service: WhatsappService;
  let crmService: CrmIntegrationsService;
  let auditLog: AuditLogRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: CrmIntegrationsService,
          useValue: {
            getActiveIntegration: jest.fn(),
            markIntegrationAuthError: jest.fn(),
          },
        },
        {
          provide: SystemMessagesService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditLogRepository,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    crmService = module.get<CrmIntegrationsService>(CrmIntegrationsService);
    auditLog = module.get<AuditLogRepository>(AuditLogRepository);

    // Silence logger for tests
    (service as any).logger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    };
  });

  it("should mark integration auth error on 401/403", async () => {
    const integration = {
      id: "int-1",
      apiKey: "key",
      apiUrl: "https://api.test",
      config: { phoneNumberId: "phone-1" },
    };
    (crmService.getActiveIntegration as jest.Mock).mockResolvedValue(
      integration,
    );

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest
        .fn()
        .mockResolvedValue({ error: { message: "Invalid token" } }),
    });

    const result = await service.sendMessage("tenant-1", "1234567890", "Hello");

    expect(result.success).toBe(false);
    expect(crmService.markIntegrationAuthError).toHaveBeenCalledWith(
      "int-1",
      "Invalid token",
    );
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "whatsapp.message.failed",
        tenantId: "tenant-1",
        details: expect.objectContaining({
          status: 401,
          error: "Invalid token",
        }),
      }),
    );
  });

  it("should log audit record on successful send", async () => {
    const integration = {
      id: "int-1",
      apiKey: "key",
      apiUrl: "https://api.test",
      config: { phoneNumberId: "phone-1" },
    };
    (crmService.getActiveIntegration as jest.Mock).mockResolvedValue(
      integration,
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ messages: [{ id: "wa-msg-1" }] }),
    });

    const result = await service.sendMessage("tenant-1", "1234567890", "Hello");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("wa-msg-1");
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "whatsapp.message.sent",
        details: expect.objectContaining({ messageId: "wa-msg-1" }),
      }),
    );
  });
});
