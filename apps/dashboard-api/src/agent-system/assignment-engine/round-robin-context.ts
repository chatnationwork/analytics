/**
 * Round-robin context provider: returns the next index for a given key and increments.
 * In-memory impl is default; can be replaced with Redis/DB for HA (multi-instance).
 * Interface is async to support Redis INCR. See assignment_engine_phase5_design.md.
 */

export const ROUND_ROBIN_CONTEXT_PROVIDER =
  "RoundRobinContextProvider" as const;

export interface RoundRobinContextProvider {
  /**
   * Returns the next index in [0, candidateCount) for the given key and increments
   * the internal counter for that key.
   */
  getNextIndex(contextKey: string, candidateCount: number): Promise<number>;
}

/**
 * In-memory implementation. State is lost on process restart.
 * For HA, inject a provider that uses Redis or DB.
 */
export class InMemoryRoundRobinContextProvider implements RoundRobinContextProvider {
  private readonly state: Record<string, number> = {};

  async getNextIndex(
    contextKey: string,
    candidateCount: number,
  ): Promise<number> {
    if (candidateCount <= 0) return 0;
    const n = this.state[contextKey] ?? 0;
    this.state[contextKey] = n + 1;
    return n % candidateCount;
  }
}
