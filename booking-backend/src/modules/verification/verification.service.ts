import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";
import {
  InvalidVerificationCodeException,
  MaxAttemptsExceededException,
  VerificationUnavailableException,
} from "./exceptions/verification.exceptions";

/**
 * Lua script evaluation result type.
 */
interface LuaEvalResult {
  status?:
    | "not_found"
    | "already_used"
    | "max_attempts"
    | "invalid_code"
    | "success";
  attempts?: number;
  success?: boolean;
}

/**
 * Service for managing email verification codes using Redis.
 *
 * Features:
 * - 6-digit numeric codes with 5-minute TTL
 * - Atomic operations using Lua scripts to prevent replay attacks
 * - Maximum 3 attempt limit per code
 * - Cache-Aside pattern via CacheService
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly TTL_SECONDS = 300; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  // Lua script for atomic verification (preserves TTL on attempts update)
  // Returns JSON strings via cjson.encode to avoid RESP named-key table serialization loss
  private static readonly VERIFY_CODE_LUA = `
    local data = redis.call('GET', KEYS[1])
    if not data then
      return cjson.encode({status = 'not_found'})
    end

    local verification = cjson.decode(data)

    -- Check if already used
    if verification.used then
      return cjson.encode({status = 'already_used'})
    end

    -- Check max attempts
    if verification.attempts >= tonumber(ARGV[2]) then
      return cjson.encode({status = 'max_attempts'})
    end

    -- Check code match
    if verification.code ~= ARGV[1] then
      -- Increment attempts and preserve TTL
      local ttl = redis.call('TTL', KEYS[1])
      verification.attempts = verification.attempts + 1
      redis.call('SET', KEYS[1], cjson.encode(verification))
      if ttl > 0 then
        redis.call('EXPIRE', KEYS[1], ttl)
      end
      return cjson.encode({status = 'invalid_code', attempts = verification.attempts})
    end

    -- Mark as used and delete
    verification.used = true
    redis.call('DEL', KEYS[1])
    return cjson.encode({status = 'success'})
  `;

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Generate a 6-digit verification code and store it in Redis.
   *
   * @param email - Email address to send the code to
   * @param type - Type of verification (REGISTER, LOGIN, RESET)
   * @returns The generated 6-digit code
   */
  async generateCode(email: string, type: string): Promise<string> {
    if (!this.cacheService.isAvailable()) {
      throw new VerificationUnavailableException();
    }

    const code = this.generateRandomCode();
    const key = this.buildKey(email, type);

    const data = {
      code,
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.cacheService.set(key, data, this.TTL_SECONDS);
      this.logger.log(`Verification code generated (${type})`);
      return code;
    } catch (error) {
      this.logger.error(
        `Failed to store verification code for ${type}`,
        (error as Error).stack,
      );
      throw new VerificationUnavailableException();
    }
  }

  /**
   * Verify a verification code atomically.
   *
   * Uses Lua script to prevent race conditions and replay attacks.
   *
   * @param email - Email address associated with the code
   * @param code - The 6-digit code to verify
   * @param type - Type of verification (REGISTER, LOGIN, RESET)
   * @returns { success: true } if verification succeeds
   * @throws InvalidVerificationCodeException if code is invalid or already used
   * @throws MaxAttemptsExceededException if maximum attempts exceeded
   */
  async verifyCode(
    email: string,
    code: string,
    type: string,
  ): Promise<{ success: boolean }> {
    if (!this.cacheService.isAvailable()) {
      throw new VerificationUnavailableException();
    }

    const redisClient = this.cacheService.getClient();
    if (!redisClient) {
      throw new VerificationUnavailableException();
    }

    const key = this.cacheService.getPrefixedKey(this.buildKey(email, type));

    try {
      const rawResult = (await redisClient.eval(
        VerificationService.VERIFY_CODE_LUA,
        1,
        key,
        code,
        String(this.MAX_ATTEMPTS),
      )) as string;
      const result = (
        typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult
      ) as LuaEvalResult;

      if (result.status === "not_found") {
        throw new InvalidVerificationCodeException(
          "Invalid or expired verification code",
        );
      }

      if (result.status === "already_used") {
        throw new InvalidVerificationCodeException(
          "Verification code has already been used",
        );
      }

      if (result.status === "max_attempts") {
        throw new MaxAttemptsExceededException();
      }

      if (result.status === "invalid_code") {
        const remainingAttempts = this.MAX_ATTEMPTS - (result.attempts ?? 0);
        throw new InvalidVerificationCodeException(
          `Invalid verification code. ${remainingAttempts} attempts remaining`,
        );
      }

      if (result.status === "success") {
        this.logger.log(
          `Verification code verified successfully for ${email} (${type})`,
        );
        return { success: true };
      }

      throw new InvalidVerificationCodeException(
        "Invalid or expired verification code",
      );
    } catch (error) {
      if (
        error instanceof InvalidVerificationCodeException ||
        error instanceof MaxAttemptsExceededException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to verify code for ${email}`,
        (error as Error).stack,
      );
      throw new VerificationUnavailableException();
    }
  }

  /**
   * Delete a verification code from Redis.
   *
   * @param email - Email address associated with the code
   * @param type - Type of verification
   */
  async deleteCode(email: string, type: string): Promise<void> {
    const key = this.buildKey(email, type);
    await this.cacheService.delete(key);
    this.logger.log(`Verification code deleted (${type})`);
  }

  /**
   * Check if a verification code exists for the given email and type.
   *
   * @param email - Email address
   * @param type - Type of verification
   * @returns true if a code exists, false otherwise
   */
  async exists(email: string, type: string): Promise<boolean> {
    const key = this.buildKey(email, type);
    return await this.cacheService.has(key);
  }

  /**
   * Get the number of attempts for a verification code.
   *
   * @param email - Email address
   * @param type - Type of verification
   * @returns Number of attempts, or 0 if code does not exist
   */
  async getAttempts(email: string, type: string): Promise<number> {
    const key = this.buildKey(email, type);
    const data = await this.cacheService.get<{ attempts: number }>(key);
    return data?.attempts ?? 0;
  }

  /**
   * Get the verification code (internal method for testing).
   *
   * @param email - Email address
   * @param type - Type of verification
   * @returns The code, or null if not found
   */
  async getCode(email: string, type: string): Promise<string | null> {
    const key = this.buildKey(email, type);
    const data = await this.cacheService.get<{ code: string }>(key);
    return data?.code ?? null;
  }

  /**
   * Generate a random 6-digit numeric code.
   *
   * @returns A string containing 6 digits (100000-999999)
   */
  private generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Build the Redis key for a verification code.
   *
   * Format: verification:email:{email}:{type}
   *
   * @param email - Email address
   * @param type - Type of verification
   * @returns The formatted Redis key
   */
  private buildKey(email: string, type: string): string {
    return `verification:email:${email}:${type}`;
  }
}
