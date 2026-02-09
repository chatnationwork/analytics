import { Injectable } from "@nestjs/common";
import {
  TenantRepository,
  SystemMessagesConfig,
} from "@lib/database";
import {
  DEFAULT_SYSTEM_MESSAGES,
  getSystemMessage,
} from "./system-messages.constants";

@Injectable()
export class SystemMessagesService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  /**
   * Get resolved system message for a key (tenant override or default).
   */
  async get(
    tenantId: string,
    key: keyof SystemMessagesConfig,
  ): Promise<string> {
    const tenant = await this.tenantRepository.findById(tenantId);
    return getSystemMessage(tenant?.settings ?? null, key);
  }

  /**
   * Get all system message keys and their current values (tenant override or default).
   */
  async getAll(tenantId: string): Promise<Record<string, string>> {
    const tenant = await this.tenantRepository.findById(tenantId);
    const settings = tenant?.settings ?? null;
    const out: Record<string, string> = {};
    const keys = Object.keys(
      DEFAULT_SYSTEM_MESSAGES,
    ) as (keyof SystemMessagesConfig)[];
    for (const key of keys) {
      out[key] = getSystemMessage(settings, key);
    }
    return out;
  }

  /** Defaults for the UI (labels/descriptions). */
  getDefaults(): typeof DEFAULT_SYSTEM_MESSAGES {
    return { ...DEFAULT_SYSTEM_MESSAGES };
  }
}
