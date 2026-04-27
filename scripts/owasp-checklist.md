# OWASP Top 10 Security Checklist - Booking System

> **Project**: Booking System Refactor (Angular v21+ / NestJS v11+)
> **Security Baseline**: `.opencode/context/requirements/安全架构设计文档.md` v2.1.0
> **OWASP Version**: OWASP Top 10 2021
> **Last Updated**: 2026-04-16

---

## How to Use This Checklist

1. Each OWASP Top 10 category has automated checks (from `security-audit.sh`) and manual review items
2. Mark each item as ✅ (compliant), ❌ (non-compliant), or ⏭️ (not applicable)
3. All ❌ items must be remediated before production deployment
4. This checklist should be run at least once per sprint and before each release

---

## A01:2021 – Broken Access Control

**Risk**: Users can act outside their intended permissions, access other users' data, or bypass authorization.

**Security Doc Reference**: Section 2.2 (RBAC 权限模型), Section 2.2.2 (NestJS 授权守卫)

### Automated Checks
- [x] `RolesGuard` and `PermissionsGuard` exist in codebase
- [x] `@Roles()` and `@Permissions()` decorators are used on controllers
- [x] `AuthGuard` is applied to protected routes

### Manual Review
- [ ] All API endpoints have `@UseGuards(AuthGuard)` applied (no unprotected endpoints except `@Public()`)
- [ ] Admin-only endpoints have `@Roles(SystemRole.ADMIN)` decorator
- [ ] Resource-level authorization: users can only access their own appointments/data
- [ ] No Insecure Direct Object References (IDOR) — validate ownership on every resource access
- [ ] CORS `origin` whitelist is restrictive (no `*` in production)
- [ ] `@Public()` decorator is used sparingly and only on login/refresh/health endpoints
- [ ] Horizontal privilege escalation is prevented (user A cannot access user B's data)
- [ ] Vertical privilege escalation is prevented (CUSTOMER cannot access ADMIN endpoints)

### Code Locations to Review
```
booking-backend/src/guards/auth.guard.ts
booking-backend/src/guards/roles.guard.ts
booking-backend/src/guards/permissions.guard.ts
booking-backend/src/decorators/roles.decorator.ts
booking-backend/src/decorators/permissions.decorator.ts
booking-backend/src/decorators/public.decorator.ts
```

---

## A02:2021 – Cryptographic Failures

**Risk**: Sensitive data is exposed due to weak or missing cryptographic protections.

**Security Doc Reference**: Section 5.1 (数据加密策略), Section 4.3 (密钥管理)

### Automated Checks
- [x] bcrypt usage detected for password hashing
- [x] JWT algorithm configuration (HS256) detected

### Manual Review
- [ ] JWT secrets are at least 256 bits (32 bytes) — verify with `openssl rand -base64 32`
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different values
- [ ] Password hashing uses bcrypt with cost factor >= 12
- [ ] Sensitive fields (phone number, ID number) use AES-256-GCM encryption at rest
- [ ] TLS 1.3 is enforced in production (`minVersion: 'TLSv1.3'`)
- [ ] Only strong ciphers are enabled (TLS_AES_256_GCM_SHA384, etc.)
- [ ] Random values use `crypto.randomBytes()`, NOT `Math.random()`
- [ ] No sensitive data is logged in plaintext
- [ ] Encryption keys are rotated on a regular schedule
- [ ] Secrets are NOT stored in `.env` files committed to version control

### Key Security Configurations
```typescript
// JWT Configuration (should match)
accessToken: { algorithm: 'HS256', expiresIn: '15m' }
refreshToken: { algorithm: 'HS256', expiresIn: '7d' }

// Encryption
algorithm: 'aes-256-gcm'

// Password
bcrypt.hash(password, 12) // cost factor >= 12
```

---

## A03:2021 – Injection

**Risk**: Untrusted data is sent to an interpreter without proper validation/escaping.

**Security Doc Reference**: Section 5.2.2 (SQL 注入防护), Section 6.1 (输入验证与过滤)

### Automated Checks
- [x] Prisma ORM is used (parameterized queries by default)
- [x] `class-validator` decorators detected on DTOs
- [x] No raw SQL queries (`$queryRaw`, `$executeRaw`) detected

### Manual Review
- [ ] All database queries use Prisma ORM (no raw SQL without parameterization)
- [ ] If `$queryRaw` or `$executeRaw` is used, all parameters are properly parameterized
- [ ] All DTOs have complete `class-validator` decorators:
  - [ ] `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`, `@IsDateString()`
  - [ ] `@MinLength()`, `@MaxLength()` for string fields
  - [ ] `@IsEnum()` for enum fields
- [ ] File upload endpoints validate file type, size, and extension
- [ ] No `eval()`, `Function()`, or `new Function()` usage in codebase
- [ ] No string concatenation for SQL or shell commands
- [ ] User input is sanitized before rendering in Angular templates
- [ ] Angular's built-in XSS protection (DomSanitizer) is not bypassed unnecessarily

### DTO Validation Checklist
- [ ] `CreateAppointmentDto` validates all fields
- [ ] `UpdateAppointmentDto` validates all fields
- [ ] `CreateUserDto` / `LoginDto` validate credentials
- [ ] All `@ApiProperty()` decorators have `example` values for Swagger

---

## A04:2021 – Insecure Design

**Risk**: Missing security controls in the design phase lead to exploitable business logic.

**Security Doc Reference**: Section 3.5 (速率限制与DDoS防护), Section 6.3 (业务逻辑安全)

### Manual Review
- [ ] Rate limiting is configured per 接口设计规范文档 Section 2.3.3:
  - [ ] User + time slot: 1 request/second
  - [ ] User daily total: 20 requests/day
  - [ ] IP global limit: 10 requests/minute
  - [ ] Global user limit: 100 requests/minute
- [ ] Concurrency slot抢占 uses PostgreSQL unique index atomicity (`@@unique`)
- [ ] Business logic prevents double-booking scenarios
- [ ] No unlimited loops or recursion paths that could cause DoS
- [ ] Time slot capacity limits are enforced at database level
- [ ] Appointment cancellation has proper authorization checks
- [ ] No business logic bypass through parameter manipulation
- [ ] Threat modeling was performed for critical user journeys

### Rate Limiting Implementation
```typescript
// Expected decorators on appointment creation
@Throttle(10, 60)  // 10 requests per 60 seconds
@UseGuards(ThrottlerGuard)
```

---

## A05:2021 – Security Misconfiguration

**Risk**: Insecure default configurations, incomplete configurations, or verbose error messages.

**Security Doc Reference**: Section 3.2 (安全头部管理), Section 3.3 (CORS 配置)

### Automated Checks
- [ ] `.env` is in `.gitignore`
- [ ] No `console.log` with sensitive data patterns

### Manual Review
- [ ] `helmet` middleware is applied globally in `main.ts`
- [ ] All required security headers are present:
  - [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: DENY`
  - [ ] `Content-Security-Policy` with restrictive directives
  - [ ] `X-XSS-Protection: 1; mode=block`
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] `Cross-Origin-Opener-Policy: same-origin`
  - [ ] `Cross-Origin-Resource-Policy: same-site`
- [ ] CORS origin whitelist is restrictive (no `*` in production)
- [ ] Error messages don't leak stack traces in production (`GlobalExceptionFilter`)
- [ ] Default credentials are changed from development values
- [ ] Unnecessary HTTP methods are disabled
- [ ] `X-Powered-By` header is removed (`app.disable('x-powered-by')`)
- [ ] Angular production build is used (`ng build --configuration=production`)
- [ ] Source maps are disabled in production builds
- [ ] `enableProdMode()` is called in Angular `main.ts`

### Header Configuration Reference
```typescript
// Expected helmet configuration (安全架构设计文档.md Section 3.2)
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // ... (see doc for full config)
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xFrameOptions: { action: 'deny' },
  // ...
})
```

---

## A06:2021 – Vulnerable and Outdated Components

**Risk**: Using components with known vulnerabilities.

**Security Doc Reference**: Section 8.2 (漏洞管理)

### Automated Checks
- [ ] `npm audit` passes for booking-backend (see Section 1 of audit report)
- [ ] `npm audit` passes for booking-frontend (see Section 1 of audit report)
- [ ] No critical vulnerabilities detected (see Section 1 of audit report)

### Manual Review
- [ ] Dependencies are pinned to specific versions in `package.json`
- [ ] No deprecated packages are in use
- [ ] Angular version is v21+ (as per architecture spec)
- [ ] NestJS version is v11+ (as per architecture spec)
- [ ] Prisma version is current and compatible with PostgreSQL 16
- [ ] Redis client version is compatible with Redis 7.x
- [ ] Regular dependency updates are scheduled (e.g., weekly Dependabot)
- [ ] CI pipeline includes `npm audit` as a blocking step

---

## A07:2021 – Identification and Authentication Failures

**Risk**: Weak authentication allows attackers to compromise passwords, keys, or sessions.

**Security Doc Reference**: Section 2.1 (认证机制), Section 2.3 (会话安全)

### Manual Review
- [ ] Access Token expires within 15 minutes (`expiresIn: '15m'`)
- [ ] Refresh Token has reasonable expiry (7 days recommended)
- [ ] JWT blacklist (Redis) is checked on every authenticated request
- [ ] Token family rotation is implemented (防重放攻击)
- [ ] Login attempts are rate-limited (e.g., 5 attempts per 15 minutes)
- [ ] MFA is available for high-risk operations (new device, sensitive actions)
- [ ] Password policy enforces minimum complexity (length, character types)
- [ ] Session timeout is enforced on inactivity
- [ ] "Remember me" functionality uses secure token rotation
- [ ] Logout properly invalidates both access and refresh tokens
- [ ] Concurrent session limit is enforced (max 5 sessions per user)

### Token Security Checklist
```typescript
// Access Token Payload (安全架构设计文档.md Section 2.1.1)
{
  sub: string;        // User ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;        // Must be within 15 minutes
  jti: string;        // Unique token ID (for blacklist)
}

// Refresh Token Payload
{
  sub: string;
  tokenFamily: string; // For replay attack prevention
  iat: number;
  exp: number;         // 7 days
}
```

---

## A08:2021 – Software and Data Integrity Failures

**Risk**: Code and infrastructure not protected against integrity violations.

**Security Doc Reference**: Section 7.1 (容器安全), Section 4 (密钥管理)

### Manual Review
- [ ] CI/CD pipeline verifies dependency integrity (`npm ci` vs `npm install`)
- [ ] Docker images use specific tags (NOT `latest`)
- [ ] Dockerfiles use non-root user (`USER nodejs`)
- [ ] Dockerfiles use minimal base images (`node:22-alpine`)
- [ ] Build artifacts are signed or checksummed
- [ ] No untrusted deserialization endpoints
- [ ] `package-lock.json` is committed and verified in CI
- [ ] Supply chain attacks are mitigated (pin dependencies, verify signatures)
- [ ] Infrastructure as Code (Docker Compose) is version controlled

### Docker Security Checklist
```dockerfile
# Expected Dockerfile security practices
FROM node:22-alpine           # Minimal base image
USER nodejs                   # Non-root user
COPY --chown=nodejs:nodejs    # Proper ownership
```

---

## A09:2021 – Security Logging and Monitoring Failures

**Risk**: Insufficient logging and monitoring delays breach detection.

**Security Doc Reference**: Section 8.1 (安全事件监控)

### Manual Review
- [ ] Winston logging is configured for structured logging
- [ ] Failed login attempts are logged (with IP, timestamp, user agent)
- [ ] Permission denied events are logged
- [ ] Rate limit trigger events are logged
- [ ] Token validation failures are logged
- [ ] Security events are stored in `security_logs` table
- [ ] Logs do NOT contain sensitive data (passwords, tokens, PII)
- [ ] Log retention policy is defined and enforced
- [ ] Alert thresholds are configured for:
  - [ ] > 10 failed logins per IP per hour
  - [ ] > 50 rate limit triggers per IP per hour
  - [ ] Any unauthorized access attempts to admin endpoints
- [ ] `LoggingInterceptor` is applied globally

### Audit Log Schema
```prisma
// Expected security log model
model SecurityLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String
  ipAddress String
  userAgent String
  timestamp DateTime @default(now())
}
```

---

## A10:2021 – Server-Side Request Forgery (SSRF)

**Risk**: Attacker can induce the server to make requests to unintended destinations.

### Manual Review
- [ ] External URLs are validated against an allowlist
- [ ] No user-controlled URLs are passed to `fetch()`, `axios()`, or `http.get()`
- [ ] Internal metadata endpoints are blocked (e.g., `169.254.169.254`)
- [ ] Redirect responses do NOT follow to internal IP ranges
- [ ] URL parsing validates scheme (only `https://` allowed)
- [ ] DNS rebinding attacks are mitigated (resolve DNS before validation)
- [ ] If webhook functionality exists, target URLs are pre-approved
- [ ] File upload from URL features validate destination before fetching

### Blocked IP Ranges (if SSRF protection is implemented)
```
10.0.0.0/8          // Private network
172.16.0.0/12       // Private network
192.168.0.0/16      // Private network
127.0.0.0/8         // Loopback
169.254.0.0/16      // Link-local (cloud metadata)
::1/128             // IPv6 loopback
```

---

## Quick Reference: Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | (see Section 3.2 of security doc) | Restrict resource loading |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-site` | Restrict resource sharing |
| `X-Powered-By` | (removed) | Hide tech stack |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Security Reviewer | | | |
| Architect | | | |

---

*This checklist is based on 安全架构设计文档.md v2.1.0 and OWASP Top 10 2021.*
*Review and update this checklist with each major release.*
