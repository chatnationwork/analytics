/**
 * Unit tests for RedisRoundRobinContextProvider.
 * Mocks Redis to verify INCR and EXPIRE (key + TTL) behaviour.
 */

import { RedisRoundRobinContextProvider } from "../src/agent-system/assignment-engine/round-robin-context-redis";

describe("RedisRoundRobinContextProvider", () => {
  const KEY_PREFIX = "assignment:rr:";
  const TTL_SECONDS = 7 * 24 * 60 * 60;

  it("returns index in [0, candidateCount) and calls INCR then EXPIRE", async () => {
    const incr = jest.fn().mockResolvedValue(1);
    const expire = jest.fn().mockResolvedValue("OK");
    const redis = { incr, expire } as unknown as import("ioredis").Redis;

    const provider = new RedisRoundRobinContextProvider(redis);
    const contextKey = "team-1";
    const candidateCount = 3;

    const index = await provider.getNextIndex(contextKey, candidateCount);

    expect(index).toBe(0);
    expect(incr).toHaveBeenCalledTimes(1);
    expect(incr).toHaveBeenCalledWith(KEY_PREFIX + contextKey);
    expect(expire).toHaveBeenCalledTimes(1);
    expect(expire).toHaveBeenCalledWith(KEY_PREFIX + contextKey, TTL_SECONDS);
  });

  it("returns (value - 1) % candidateCount for successive INCRs", async () => {
    const incr = jest
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    const expire = jest.fn().mockResolvedValue("OK");
    const redis = { incr, expire } as unknown as import("ioredis").Redis;

    const provider = new RedisRoundRobinContextProvider(redis);
    const key = "team-1";
    const n = 3;

    expect(await provider.getNextIndex(key, n)).toBe(0);
    expect(await provider.getNextIndex(key, n)).toBe(1);
    expect(await provider.getNextIndex(key, n)).toBe(2);
    expect(await provider.getNextIndex(key, n)).toBe(0);
    expect(expire).toHaveBeenCalledTimes(4);
  });

  it("returns 0 when candidateCount <= 0 and does not call Redis", async () => {
    const incr = jest.fn();
    const expire = jest.fn();
    const redis = { incr, expire } as unknown as import("ioredis").Redis;

    const provider = new RedisRoundRobinContextProvider(redis);

    expect(await provider.getNextIndex("any", 0)).toBe(0);
    expect(await provider.getNextIndex("any", -1)).toBe(0);
    expect(incr).not.toHaveBeenCalled();
    expect(expire).not.toHaveBeenCalled();
  });
});
