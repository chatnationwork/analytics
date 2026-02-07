/**
 * =============================================================================
 * USER SESSION REPOSITORY
 * =============================================================================
 *
 * Get/set/clear the single active session id per user for single-login enforcement.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserSessionEntity } from "../entities/user-session.entity";

@Injectable()
export class UserSessionRepository {
  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly repo: Repository<UserSessionEntity>,
  ) {}

  async getCurrentSessionId(userId: string): Promise<string | null> {
    const row = await this.repo.findOne({ where: { userId } });
    return row?.sessionId ?? null;
  }

  async setCurrentSessionId(userId: string, sessionId: string): Promise<void> {
    await this.repo.upsert(
      { userId, sessionId },
      { conflictPaths: ["userId"] },
    );
  }

  async clearSession(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
