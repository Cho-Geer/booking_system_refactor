/**
 * test/fakes/ — Barrel exports
 *
 * Provides drop-in replacement implementations for TIER2 services.
 * These are stateful, in-memory fakes that behave like the real services.
 */

export { FakeEventBus, EventRecord } from "./fake-event-bus";
export {
  FakeMessageQueue,
  FakeJob,
  JobStatus,
  JobOptions,
} from "./fake-message-queue";
export { LocalJwtSigner } from "./local-jwt-signer";
export {
  FakeRateLimiter,
  RateLimitResult,
  RateLimiterOptions,
} from "./fake-rate-limiter";
export { FakePrismaClient } from "./fake-prisma-client";
