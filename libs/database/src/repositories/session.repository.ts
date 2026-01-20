/**
 * =============================================================================
 * SESSION REPOSITORY
 * =============================================================================
 * 
 * Data access layer for session-level data.
 * 
 * SESSIONS:
 * --------
 * Sessions are created/updated by the processor worker when it
 * processes events. This repository provides read access for the dashboard.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  /**
   * Save or update a session.
   * 
   * @param session - Session data (partial for updates)
   * @returns The saved session
   */
  async save(session: Partial<SessionEntity>): Promise<SessionEntity> {
    const entity = this.repo.create(session);
    return this.repo.save(entity);
  }

  /**
   * Find a session by ID.
   * 
   * @param sessionId - The session UUID
   * @returns Session if found, null otherwise
   */
  async findById(sessionId: string): Promise<SessionEntity | null> {
    return this.repo.findOne({ where: { sessionId } });
  }

  /**
   * Find all sessions for a specific user.
   * 
   * Used to show a user's session history.
   * 
   * @param tenantId - Tenant filter
   * @param userId - The user to look up
   * @param limit - Max sessions to return
   * @returns Sessions sorted by start time (newest first)
   */
  async findByUserId(
    tenantId: string,
    userId: string,
    limit = 50,
  ): Promise<SessionEntity[]> {
    return this.repo.find({
      where: { tenantId, userId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get paginated sessions within a date range.
   * 
   * PAGINATION:
   * ----------
   * We use findAndCount() to get both:
   * 1. The sessions for the current page
   * 2. The total count for pagination UI
   * 
   * @param tenantId - Tenant filter
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Items per page
   * @param offset - Items to skip
   * @returns Object with sessions array and total count
   */
  async findByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 100,
    offset = 0,
  ): Promise<{ sessions: SessionEntity[]; total: number }> {
    const [sessions, total] = await this.repo.findAndCount({
      where: {
        tenantId,
        startedAt: Between(startDate, endDate),
      },
      order: { startedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { sessions, total };
  }

  /**
   * Get aggregate statistics for the overview dashboard.
   * 
   * This runs a single query that calculates:
   * - Total sessions
   * - Unique users (identified users only)
   * - Conversion rate
   * - Average session duration
   * 
   * Much more efficient than multiple queries!
   * 
   * @param tenantId - Tenant filter
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Aggregate statistics object
   */
  async getOverviewStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalSessions: number;
    totalUsers: number;
    conversionRate: number;
    avgSessionDuration: number;
  }> {
    const result = await this.repo
      .createQueryBuilder('session')
      // COUNT(*) counts all sessions
      .select('COUNT(*)', 'totalSessions')
      // COUNT(DISTINCT user_id) counts unique users
      .addSelect('COUNT(DISTINCT session.userId)', 'totalUsers')
      // Conversion rate: sessions with converted=true / total sessions
      .addSelect(
        'CAST(SUM(CASE WHEN session.converted THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(*), 0)',
        'conversionRate',
      )
      // Average of duration_seconds
      .addSelect('AVG(session.durationSeconds)', 'avgSessionDuration')
      .where('session.tenantId = :tenantId', { tenantId })
      .andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // Parse strings to numbers, with defaults for null/undefined
    return {
      totalSessions: parseInt(result.totalSessions, 10) || 0,
      totalUsers: parseInt(result.totalUsers, 10) || 0,
      conversionRate: parseFloat(result.conversionRate) || 0,
      avgSessionDuration: parseFloat(result.avgSessionDuration) || 0,
    };
  }

  async getDailySessions(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder('session')
      .select("TO_CHAR(session.startedAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('session.tenantId = :tenantId', { tenantId })
      .andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("TO_CHAR(session.startedAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(session.startedAt, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    return result.map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  async getDeviceBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder('session')
      .select('session.deviceType', 'device')
      .addSelect('COUNT(*)', 'count')
      .where('session.tenantId = :tenantId', { tenantId })
      .andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('session.deviceType')
      .getRawMany();

    return result.map(r => ({
      device: r.device || 'Unknown',
      count: parseInt(r.count, 10),
    }));
  }

  async getActivityHeatmap(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder('session')
      .select('EXTRACT(DOW FROM session.startedAt)', 'day')
      .addSelect('EXTRACT(HOUR FROM session.startedAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('session.tenantId = :tenantId', { tenantId })
      .andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('EXTRACT(DOW FROM session.startedAt)')
      .addGroupBy('EXTRACT(HOUR FROM session.startedAt)')
      .getRawMany();

    return result.map(r => ({
      day: parseInt(r.day, 10),
      hour: parseInt(r.hour, 10),
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Update specific fields of a session.
   * 
   * Partial update is more efficient than loading and saving
   * the entire entity.
   * 
   * @param sessionId - Session to update
   * @param updates - Fields to update
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionEntity>,
  ): Promise<void> {
    await this.repo.update({ sessionId }, updates);
  }
}
