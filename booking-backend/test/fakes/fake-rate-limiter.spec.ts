import { FakeRateLimiter } from "./fake-rate-limiter";

describe("FakeRateLimiter", () => {
  let limiter: FakeRateLimiter;

  beforeEach(() => {
    limiter = new FakeRateLimiter({ windowMs: 60000, max: 5 });
  });

  describe("check", () => {
    it("should allow requests within the limit", () => {
      const result = limiter.check("user:1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    it("should decrease remaining on each check", () => {
      limiter.check("user:1"); // 4 remaining
      limiter.check("user:1"); // 3 remaining
      limiter.check("user:1"); // 2 remaining
      const result = limiter.check("user:1"); // 1 remaining
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should block requests exceeding the limit", () => {
      for (let i = 0; i < 5; i++) {
        limiter.check("user:1");
      }
      const result = limiter.check("user:1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track independent keys separately", () => {
      for (let i = 0; i < 5; i++) {
        limiter.check("user:1");
      }
      const result = limiter.check("user:2");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should include resetTime in the result", () => {
      const result = limiter.check("user:1");
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe("reset", () => {
    it("should reset the counter for a specific key", () => {
      for (let i = 0; i < 5; i++) {
        limiter.check("user:1");
      }
      expect(limiter.check("user:1").allowed).toBe(false);
      limiter.reset("user:1");
      const result = limiter.check("user:1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("resetAll", () => {
    it("should reset all keys", () => {
      for (let i = 0; i < 5; i++) {
        limiter.check("user:1");
        limiter.check("user:2");
      }
      limiter.resetAll();
      expect(limiter.check("user:1").allowed).toBe(true);
      expect(limiter.check("user:2").allowed).toBe(true);
    });
  });

  describe("sliding window behavior", () => {
    it("should allow requests again after the window passes", async () => {
      const fastLimiter = new FakeRateLimiter({ windowMs: 100, max: 2 });
      fastLimiter.check("key"); // 1st
      fastLimiter.check("key"); // 2nd
      expect(fastLimiter.check("key").allowed).toBe(false);

      // Wait for window to pass (+ small buffer)
      await new Promise((r) => setTimeout(r, 150));
      fastLimiter["cleanExpired"]("key");
      const result = fastLimiter.check("key");
      expect(result.allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should allow with max=0 (unlimited)", () => {
      const unlimited = new FakeRateLimiter({ windowMs: 60000, max: 0 });
      for (let i = 0; i < 100; i++) {
        expect(unlimited.check("any").allowed).toBe(true);
      }
    });

    it("should handle very small window correctly", () => {
      const tiny = new FakeRateLimiter({ windowMs: 1, max: 3 });
      tiny.check("key");
      tiny.check("key");
      tiny.check("key");
      expect(tiny.check("key").allowed).toBe(false);
    });
  });
});
