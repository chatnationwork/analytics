/**
 * Redis-backed round-robin context provider for HA (multi-instance) deployments.
 * Keys: assignment:rr:{contextKey}. TTL 7 days, refreshed after each INCR.
 * See assignment_engine_phase5_design.md §3.
 */

import type Redis from "ioredis";
import type { RoundRobinContextProvider } from "./round-robin-context";

const KEY_PREFIX = "assignment:rr:";
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class RedisRoundRobinContextProvider implements RoundRobinContextProvider {
  constructor(private readonly redis: Redis) {}

  async getNextIndex(
    contextKey: string,
    candidateCount: number,
  ): Promise<number> {
    if (candidateCount <= 0) return 0;
    const key = KEY_PREFIX + contextKey;
    const value = await this.redis.incr(key);
    await this.redis.expire(key, TTL_SECONDS);
    return (value - 1) % candidateCount;
  }
}
