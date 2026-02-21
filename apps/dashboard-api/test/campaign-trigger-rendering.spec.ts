import { Test, TestingModule } from "@nestjs/testing";
import { TriggerService } from "../src/campaigns/trigger.service";
import { CampaignOrchestratorService } from "../src/campaigns/campaign-orchestrator.service";
import { SendWorker } from "../src/campaigns/send.worker";
import { TemplateRendererService } from "../src/campaigns/template-renderer.service";
import { CampaignsService } from "../src/campaigns/campaigns.service";
import { AudienceService } from "../src/campaigns/audience.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  CampaignEntity,
  CampaignMessageEntity,
  ContactRepository,
  CampaignStatus,
} from "@lib/database";
import { WhatsappService } from "../src/whatsapp/whatsapp.service";
import { RateTrackerService } from "../src/campaigns/rate-tracker.service";
import { CAMPAIGN_QUEUE_NAME, CAMPAIGN_JOBS } from "../src/campaigns/constants";
import { getQueueToken } from "@nestjs/bullmq";
import { CampaignTrigger } from "../src/campaigns/constants";
import { Repository } from "typeorm";

describe("Campaign Trigger Rendering Integration", () => {
  let triggerService: TriggerService;
  let sendWorker: SendWorker;
  let whatsappService: WhatsappService;
  let queue: any;

  const mockCampaign = {
    id: "camp-123",
    tenantId: "tenant-1",
    status: CampaignStatus.RUNNING,
    triggerType: CampaignTrigger.TICKET_ISSUED,
    messageTemplate: {
      type: "text",
      text: { body: "Hello {{name}}, your ticket code is {{ticketCode}}." },
    },
  };

  const mockContact = {
    id: "contact-uuid",
    contactId: "254712345678",
    name: "John Doe",
    optedIn: true,
    deactivatedAt: null,
  };

  const mockCampaignRepo = {
    find: jest.fn().mockResolvedValue([mockCampaign]),
    findOne: jest.fn().mockResolvedValue(mockCampaign),
    update: jest.fn().mockResolvedValue({}),
  };

  const mockContactRepo = {
    findOne: jest.fn().mockResolvedValue(mockContact),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: "msg-1" })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: "msg-1" })),
    update: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
  };

  const mockWhatsappService = {
    sendMessage: jest.fn().mockResolvedValue({ success: true, messageId: "wa-1" }),
  };

  const mockRateTracker = {
    hasQuotaRemaining: jest.fn().mockResolvedValue(true),
    recordBusinessSend: jest.fn().mockResolvedValue({}),
  };

  const mockCampaignsService = {
    findById: jest.fn().mockResolvedValue(mockCampaign),
    updateStatus: jest.fn().mockResolvedValue({}),
  };

  const mockAudienceService = {
    resolveContactsWithWindowSplit: jest.fn().mockResolvedValue({
      inWindow: [],
      outOfWindow: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerService,
        CampaignOrchestratorService,
        SendWorker,
        TemplateRendererService,
        {
          provide: getRepositoryToken(CampaignEntity),
          useValue: mockCampaignRepo,
        },
        {
          provide: ContactRepository,
          useValue: mockContactRepo,
        },
        {
          provide: getRepositoryToken(CampaignMessageEntity),
          useValue: mockMessageRepo,
        },
        {
          provide: getQueueToken(CAMPAIGN_QUEUE_NAME),
          useValue: mockQueue,
        },
        {
          provide: WhatsappService,
          useValue: mockWhatsappService,
        },
        {
          provide: RateTrackerService,
          useValue: mockRateTracker,
        },
        {
          provide: CampaignsService,
          useValue: mockCampaignsService,
        },
        {
          provide: AudienceService,
          useValue: mockAudienceService,
        },
      ],
    }).compile();

    triggerService = module.get<TriggerService>(TriggerService);
    sendWorker = module.get<SendWorker>(SendWorker);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    queue = module.get(getQueueToken(CAMPAIGN_QUEUE_NAME));
  });

  it("should render dynamic context correctly from trigger to send", async () => {
    // 1. Fire trigger
    const payload = {
      tenantId: "tenant-1",
      contactId: "254712345678",
      context: {
        ticketCode: "TC-999",
      },
    };

    await triggerService.fire(CampaignTrigger.TICKET_ISSUED, payload);

    // Verify orchestrator enqueued job with context
    expect(queue.add).toHaveBeenCalledWith(
      CAMPAIGN_JOBS.SEND_MESSAGE,
      expect.objectContaining({
        triggerContext: { ticketCode: "TC-999" },
      }),
      expect.anything(),
    );

    // 2. Mock BullMQ Job and process it through SendWorker
    const job = {
      name: CAMPAIGN_JOBS.SEND_MESSAGE,
      data: {
        campaignId: "camp-123",
        campaignMessageId: "msg-1",
        tenantId: "tenant-1",
        recipientPhone: "254712345678",
        messagePayload: mockCampaign.messageTemplate,
        isBusinessInitiated: true,
        triggerContext: { ticketCode: "TC-999" },
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as any;

    await sendWorker.process(job);

    // Verify WhatsappService received correctly rendered body
    expect(whatsappService.sendMessage).toHaveBeenCalledWith(
      "tenant-1",
      "254712345678",
      expect.objectContaining({
        text: { body: "Hello John Doe, your ticket code is TC-999." },
      }),
    );
  });
});
