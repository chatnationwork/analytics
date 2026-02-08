import { Injectable, NotFoundException } from "@nestjs/common";
import { CrmIntegrationsService } from "../crm-integrations/crm-integrations.service";
import { CampaignListResponse, ContactListResponse } from "@lib/crm-api";

/** WhatsApp Cloud API message payload (sent to CRM endpoint). Media uses public URL (link). */
export type WhatsAppSendPayload =
  | { type: "text"; text: { body: string; preview_url?: boolean } }
  | { type: "image"; image: { link: string; caption?: string } }
  | { type: "video"; video: { link: string; caption?: string } }
  | { type: "audio"; audio: { link: string } }
  | {
      type: "document";
      document: {
        link: string;
        filename?: string;
        caption?: string;
      };
    }
  | {
      type: "location";
      location: {
        latitude: string;
        longitude: string;
        name?: string;
        address?: string;
      };
    };

/** Path the CRM expects for WhatsApp Cloud API messages (must include /api/meta/). */
const WHATSAPP_MESSAGES_PATH = "/api/meta/v21.0";

export interface WhatsappOverviewDto {
  totalContacts: number;
  totalCampaigns: number;
  activeCampaigns: number;

  // Pillar 1: Customer Insights
  customerInsights: {
    totalContacts: number;
  };

  // Pillar 2: Campaign Optimization (Funnel)
  campaignOptimization: {
    funnel: {
      sent: number;
      delivered: number;
      read: number;
      replied: number;
    };
    topCampaigns: { name: string; readRate: number; replyRate: number }[];
  };

  // Pillar 3: Engagement
  engagement: {
    conversionRate: number;
  };
}

@Injectable()
export class WhatsappService {
  constructor(private readonly crmService: CrmIntegrationsService) {}

  /**
   * Get high-level WhatsApp analytics overview
   */
  async getOverview(tenantId: string): Promise<WhatsappOverviewDto> {
    const client = await this.crmService.getClientForTenant(tenantId);
    if (!client) {
      throw new NotFoundException("CRM not configured for this tenant");
    }

    // Parallel fetch for speed
    const [contactsRes, campaignsRes] = await Promise.all([
      client.listContacts({ limit: 100 }) as Promise<ContactListResponse>,
      client.listCampaigns({ limit: 5 }) as Promise<CampaignListResponse>,
    ]);

    // Handle potential API errors
    if ("success" in contactsRes && !contactsRes.success) {
      throw new Error(contactsRes.error?.message || "Failed to fetch contacts");
    }
    if ("success" in campaignsRes && !campaignsRes.success) {
      throw new Error(
        campaignsRes.error?.message || "Failed to fetch campaigns",
      );
    }

    const totalContacts =
      "success" in contactsRes
        ? (contactsRes.pagination?.total ??
          (Array.isArray(contactsRes.data) ? contactsRes.data.length : 0))
        : 0;
    const campaigns =
      "success" in campaignsRes ? (campaignsRes.data ?? []) : [];

    // 1. Funnel Analytics: Fetch reports for top campaigns
    // Fetch sequentially with 1s delay to avoid "Too Many Requests" (429) rate limits
    const campaignReports = [];
    for (const c of campaigns) {
      try {
        const report = await client.getCampaignReport(c.campaign_id);
        // Append campaign name for easier mapping later
        (report as any).campaignName = c.name;
        campaignReports.push(report);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(
          `Failed to fetch report for campaign ${c.campaign_id}`,
          e,
        );
      }
    }

    const funnel = { sent: 0, delivered: 0, read: 0, replied: 0 };
    const topCampaigns: {
      name: string;
      readRate: number;
      replyRate: number;
    }[] = [];

    campaignReports.forEach((report) => {
      // Safe access to metrics
      if ("success" in report && report.success && report.metrics) {
        funnel.sent += report.metrics.total_recipients || 0;
        funnel.delivered += report.metrics.delivered || 0;
        funnel.read += report.metrics.read || 0;
        funnel.replied += report.metrics.replied || 0;

        const readRate =
          report.metrics.delivered > 0
            ? (report.metrics.read / report.metrics.delivered) * 100
            : 0;
        const replyRate =
          report.metrics.delivered > 0
            ? (report.metrics.replied / report.metrics.delivered) * 100
            : 0;

        topCampaigns.push({
          name: (report as any).campaignName || "Unknown",
          readRate,
          replyRate,
        });
      }
    });

    const activeCampaignsCount = campaigns.filter(
      (c) => c.status === "active" || c.status === "in_progress",
    ).length;

    // Derived Metrics from REAL data
    const conversionRate =
      funnel.delivered > 0 ? (funnel.replied / funnel.delivered) * 100 : 0;

    return {
      totalContacts,
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCampaignsCount,

      customerInsights: {
        totalContacts,
      },

      campaignOptimization: {
        funnel,
        topCampaigns: topCampaigns
          .sort((a, b) => b.replyRate - a.replyRate)
          .slice(0, 3),
      },

      engagement: {
        conversionRate,
      },
    };
  }

  async getCampaigns(tenantId: string, page: number = 1, limit: number = 20) {
    const client = await this.crmService.getClientForTenant(tenantId);
    if (!client) {
      throw new NotFoundException("CRM not configured");
    }
    const res = await client.listCampaigns({ page, limit });
    if ("success" in res && !res.success) {
      throw new Error(res.error?.message || "Failed to fetch campaigns");
    }
    return "success" in res ? res.data : [];
  }

  /**
   * Get paginated contacts list
   */
  async getContacts(tenantId: string, page: number = 1, limit: number = 20) {
    const client = await this.crmService.getClientForTenant(tenantId);
    if (!client) {
      throw new NotFoundException("CRM not configured");
    }
    const res = await client.listContacts({ page, limit });
    if ("success" in res && !res.success) {
      throw new Error(res.error?.message || "Failed to fetch contacts");
    }

    // Normalize response structure
    const data = "success" in res ? res.data : [];
    const total = "success" in res ? (res.pagination?.total ?? data.length) : 0;

    return { data, total, page, limit };
  }

  /**
   * Send a WhatsApp message via CRM endpoint (WhatsApp Cloud API format).
   * Accepts text (string) or full payload (image, video, audio, document, location).
   * When account (WABA phone number) is provided, uses that integration's credentials when the tenant has multiple.
   */
  async sendMessage(
    tenantId: string,
    to: string,
    message: string | WhatsAppSendPayload,
    options?: { account?: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const integration = await this.crmService.getActiveIntegration(
      tenantId,
      options?.account,
    );

    if (!integration || !integration.config?.phoneNumberId) {
      console.error(
        `WhatsApp credentials not configured for tenant ${tenantId}`,
      );
      return {
        success: false,
        error: "WhatsApp sending not configured for this tenant",
      };
    }

    const { phoneNumberId } = integration.config;
    const token = integration.apiKey;
    const baseUrl = (integration.apiUrl || "").replace(/\/$/, "");
    const url = `${baseUrl}${WHATSAPP_MESSAGES_PATH}/${phoneNumberId}/messages`;

    const finalNumber = to.replace(/[^\d]/g, "");

    const body: WhatsAppSendPayload =
      typeof message === "string"
        ? { type: "text", text: { body: message, preview_url: false } }
        : message;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalNumber,
      ...body,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error sending WhatsApp message:", data);
        return {
          success: false,
          error: data.error?.message || "Failed to send message via WhatsApp",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("Network Error sending WhatsApp message:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Resolve CSAT URL for a tenant: use csatLink if set, otherwise webLink + '/csat'.
   */
  private getCsatUrl(integration: {
    webLink?: string | null;
    csatLink?: string | null;
  }): string | null {
    if (integration.csatLink && integration.csatLink.trim()) {
      return integration.csatLink.trim();
    }
    const web = integration.webLink?.trim();
    if (web) {
      return web.replace(/\/$/, "") + "/csat";
    }
    return null;
  }

  /**
   * Send CSAT (customer satisfaction) CTA URL message to the user when a chat is resolved.
   * Uses interactive type "cta_url". Link is csatLink if set, otherwise webLink + '/csat'.
   * When account (WABA phone) is provided, uses that integration when the tenant has multiple.
   */
  async sendCsatCtaMessage(
    tenantId: string,
    to: string,
    options?: { account?: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const integration = await this.crmService.getActiveIntegration(
      tenantId,
      options?.account,
    );

    if (!integration || !integration.config?.phoneNumberId) {
      return {
        success: false,
        error: "WhatsApp not configured for this tenant",
      };
    }

    const csatUrl = this.getCsatUrl(integration);
    if (!csatUrl) {
      return {
        success: false,
        error:
          "CSAT link not configured (set Webview link or CSAT link in CRM integration)",
      };
    }

    const { phoneNumberId } = integration.config;
    const token = integration.apiKey;
    const baseUrl = (integration.apiUrl || "").replace(/\/$/, "");
    const url = `${baseUrl}${WHATSAPP_MESSAGES_PATH}/${phoneNumberId}/messages`;
    const finalNumber = to.replace(/[^\d]/g, "");

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalNumber,
      type: "interactive",
      interactive: {
        type: "cta_url",
        header: {
          type: "text",
          text: "How did we do?",
        },
        body: {
          text: "Your chat has been resolved. We'd love your feedback.",
        },
        footer: {
          text: "Tap the button below to rate your experience.",
        },
        action: {
          name: "cta_url",
          parameters: {
            display_text: "Rate your experience",
            url: csatUrl,
          },
        },
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error sending CSAT CTA message:", data);
        return {
          success: false,
          error: data.error?.message || "Failed to send CSAT message",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("Network Error sending CSAT CTA message:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send reengagement template via WhatsApp.
   * Template "reengagement" has body with one text parameter (contact name).
   * Used from inbox for expired chats to re-engage the user.
   */
  async sendReengagementTemplate(
    tenantId: string,
    to: string,
    contactName: string,
    options?: { account?: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const integration = await this.crmService.getActiveIntegration(
      tenantId,
      options?.account,
    );

    if (!integration || !integration.config?.phoneNumberId) {
      return {
        success: false,
        error: "WhatsApp not configured for this tenant",
      };
    }

    const { phoneNumberId } = integration.config;
    const token = integration.apiKey;
    const baseUrl = (integration.apiUrl || "").replace(/\/$/, "");
    const url = `${baseUrl}${WHATSAPP_MESSAGES_PATH}/${phoneNumberId}/messages`;
    const finalNumber = to.replace(/[^\d]/g, "");
    const variableText = (contactName || "there").trim() || "there";

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalNumber,
      type: "template",
      template: {
        language: { policy: "deterministic", code: "en" },
        name: "reengagement",
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: variableText }],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error sending reengagement template:", data);
        return {
          success: false,
          error:
            data.error?.message || "Failed to send reengagement via WhatsApp",
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("Network error sending reengagement template:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send 2FA code via WhatsApp template "2fa".
   * Template has body (one text param = code) and optional button (one text param).
   * Uses the tenant's first/active CRM integration credentials.
   */
  async sendTwoFactorCode(
    tenantId: string,
    to: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    const integration = await this.crmService.getActiveIntegration(tenantId);

    if (!integration || !integration.config?.phoneNumberId) {
      return {
        success: false,
        error: "WhatsApp not configured for this tenant",
      };
    }

    const { phoneNumberId } = integration.config;
    const token = integration.apiKey;
    const baseUrl = (integration.apiUrl || "").replace(/\/$/, "");
    const url = `${baseUrl}${WHATSAPP_MESSAGES_PATH}/${phoneNumberId}/messages`;
    const finalNumber = to.replace(/[^\d]/g, "");

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: finalNumber,
      type: "template",
      template: {
        language: { policy: "deterministic", code: "en" },
        name: "2fa",
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Error sending 2FA template:", data);
        return {
          success: false,
          error: data.error?.message || "Failed to send 2FA code via WhatsApp",
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Network Error sending 2FA code:", error);
      return { success: false, error: error.message };
    }
  }
}
