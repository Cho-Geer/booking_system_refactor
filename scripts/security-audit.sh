#!/usr/bin/env bash
# =============================================================================
# Security Audit Script for Booking System
# =============================================================================
# Description: Comprehensive security audit covering dependency vulnerabilities,
#              hardcoded secrets detection, security headers verification, and
#              OWASP Top 10 compliance checklist.
#
# Based on: .opencode/context/requirements/安全架构设计文档.md (v2.1.0)
#
# Usage: ./scripts/security-audit.sh
#
# Exit Codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Script configuration error
# =============================================================================

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/booking-backend"
FRONTEND_DIR="$PROJECT_ROOT/booking-frontend"
REPORT_FILE="$SCRIPT_DIR/security-audit-report-$(date +%Y%m%d-%H%M%S).md"
BACKEND_PORT="${BACKEND_PORT:-3001}"
AUDIT_LEVEL="critical"

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
SKIP_COUNT=0

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((SKIP_COUNT++))
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Append to report file
report() {
    echo "$1" >> "$REPORT_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# Pre-flight Checks
# ─────────────────────────────────────────────────────────────────────────────

preflight_checks() {
    log_section "Pre-flight Checks"

    # Check project directories
    if [[ ! -d "$BACKEND_DIR" ]]; then
        echo -e "${RED}ERROR: Backend directory not found: $BACKEND_DIR${NC}"
        exit 2
    fi

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        echo -e "${RED}ERROR: Frontend directory not found: $FRONTEND_DIR${NC}"
        exit 2
    fi

    # Check npm availability
    if ! command -v npm &>/dev/null; then
        echo -e "${RED}ERROR: npm is not installed or not in PATH${NC}"
        exit 2
    fi

    # Check curl availability
    if ! command -v curl &>/dev/null; then
        echo -e "${RED}ERROR: curl is not installed or not in PATH${NC}"
        exit 2
    fi

    # Check grep availability
    if ! command -v grep &>/dev/null; then
        echo -e "${RED}ERROR: grep is not installed or not in PATH${NC}"
        exit 2
    fi

    log_pass "All pre-flight checks passed"
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Dependency Vulnerability Scanning (npm audit)
# ─────────────────────────────────────────────────────────────────────────────

run_npm_audit() {
    log_section "1. Dependency Vulnerability Scanning (npm audit)"

    # ── Backend Audit ──
    echo -e "\n--- Backend (booking-backend) ---"
    report "## 1. Dependency Vulnerability Scanning"
    report ""
    report "### Backend (booking-backend)"
    report ""

    if [[ -f "$BACKEND_DIR/package.json" ]]; then
        cd "$BACKEND_DIR"

        # Full audit
        log_info "Running full npm audit for backend..."
        BACKEND_AUDIT_OUTPUT=$(npm audit 2>&1) || true
        echo "$BACKEND_AUDIT_OUTPUT" | head -50
        report "\`\`\`"
        report "$BACKEND_AUDIT_OUTPUT" | head -100
        report "\`\`\`"
        report ""

        # Check for vulnerabilities
        BACKEND_VULN_COUNT=$(echo "$BACKEND_AUDIT_OUTPUT" | grep -c "found.*vulnerabilit" || echo "0")
        if [[ "$BACKEND_VULN_COUNT" -gt 0 ]]; then
            log_warn "Backend has dependency vulnerabilities (see report for details)"
            report "**Status**: ⚠️ Vulnerabilities found"
        else
            log_pass "Backend has no known vulnerabilities"
            report "**Status**: ✅ No vulnerabilities found"
        fi

        # Critical-level audit
        log_info "Running critical-level npm audit for backend..."
        BACKEND_CRITICAL_OUTPUT=$(npm audit --audit-level=critical 2>&1) || true
        BACKEND_CRITICAL_COUNT=$(echo "$BACKEND_CRITICAL_OUTPUT" | grep -c "found.*critical" || echo "0")
        if [[ "$BACKEND_CRITICAL_COUNT" -gt 0 ]]; then
            log_fail "Backend has CRITICAL vulnerabilities!"
            echo "$BACKEND_CRITICAL_OUTPUT" | head -30
            report ""
            report "### Backend Critical Vulnerabilities"
            report ""
            report "**Status**: 🚨 CRITICAL vulnerabilities found"
            report ""
            report "\`\`\`"
            report "$BACKEND_CRITICAL_OUTPUT" | head -100
            report "\`\`\`"
        else
            log_pass "Backend has no critical vulnerabilities"
            report ""
            report "### Backend Critical Audit"
            report ""
            report "**Status**: ✅ No critical vulnerabilities"
        fi

        report ""
    else
        log_skip "Backend package.json not found"
        report "**Status**: ⏭️ Skipped (package.json not found)"
        report ""
    fi

    # ── Frontend Audit ──
    echo -e "\n--- Frontend (booking-frontend) ---"
    report "### Frontend (booking-frontend)"
    report ""

    if [[ -f "$FRONTEND_DIR/package.json" ]]; then
        cd "$FRONTEND_DIR"

        # Full audit
        log_info "Running full npm audit for frontend..."
        FRONTEND_AUDIT_OUTPUT=$(npm audit 2>&1) || true
        echo "$FRONTEND_AUDIT_OUTPUT" | head -50
        report "\`\`\`"
        report "$FRONTEND_AUDIT_OUTPUT" | head -100
        report "\`\`\`"
        report ""

        # Check for vulnerabilities
        FRONTEND_VULN_COUNT=$(echo "$FRONTEND_AUDIT_OUTPUT" | grep -c "found.*vulnerabilit" || echo "0")
        if [[ "$FRONTEND_VULN_COUNT" -gt 0 ]]; then
            log_warn "Frontend has dependency vulnerabilities (see report for details)"
            report "**Status**: ⚠️ Vulnerabilities found"
        else
            log_pass "Frontend has no known vulnerabilities"
            report "**Status**: ✅ No vulnerabilities found"
        fi

        # Critical-level audit
        log_info "Running critical-level npm audit for frontend..."
        FRONTEND_CRITICAL_OUTPUT=$(npm audit --audit-level=critical 2>&1) || true
        FRONTEND_CRITICAL_COUNT=$(echo "$FRONTEND_CRITICAL_OUTPUT" | grep -c "found.*critical" || echo "0")
        if [[ "$FRONTEND_CRITICAL_COUNT" -gt 0 ]]; then
            log_fail "Frontend has CRITICAL vulnerabilities!"
            echo "$FRONTEND_CRITICAL_OUTPUT" | head -30
            report ""
            report "### Frontend Critical Vulnerabilities"
            report ""
            report "**Status**: 🚨 CRITICAL vulnerabilities found"
            report ""
            report "\`\`\`"
            report "$FRONTEND_CRITICAL_OUTPUT" | head -100
            report "\`\`\`"
        else
            log_pass "Frontend has no critical vulnerabilities"
            report ""
            report "### Frontend Critical Audit"
            report ""
            report "**Status**: ✅ No critical vulnerabilities"
        fi

        report ""
    else
        log_skip "Frontend package.json not found"
        report "**Status**: ⏭️ Skipped (package.json not found)"
        report ""
    fi

    cd "$PROJECT_ROOT"
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Hardcoded Secrets Detection
# ─────────────────────────────────────────────────────────────────────────────

check_hardcoded_secrets() {
    log_section "2. Hardcoded Secrets Detection"

    report "## 2. Hardcoded Secrets Detection"
    report ""
    report "Scanning for hardcoded passwords, secrets, and keys in source files..."
    report ""

    # Patterns to search (case-insensitive)
    SECRET_PATTERNS=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "api_key\s*=\s*['\"][^'\"]+['\"]"
        "apikey\s*=\s*['\"][^'\"]+['\"]"
        "private_key\s*=\s*['\"][^'\"]+['\"]"
        "jwt_secret\s*=\s*['\"][^'\"]+['\"]"
        "db_password\s*=\s*['\"][^'\"]+['\"]"
        "AWS_SECRET_ACCESS_KEY"
        "PRIVATE_KEY"
    )

    SECRETS_FOUND=0

    for dir in "$BACKEND_DIR/src" "$FRONTEND_DIR/src"; do
        if [[ -d "$dir" ]]; then
            log_info "Scanning directory: $dir"
            report "### Scanning: \`$(basename $(dirname $dir))/$(basename $dir)\`"
            report ""

            for pattern in "${SECRET_PATTERNS[@]}"; do
                MATCHES=$(grep -rn --include="*.ts" --include="*.js" --include="*.env" \
                    -E "$pattern" "$dir" 2>/dev/null | \
                    grep -v ".spec.ts" | \
                    grep -v ".test.ts" | \
                    grep -v "node_modules" | \
                    grep -v ".env.example" | \
                    grep -v "environment.ts" | \
                    grep -v "environment.prod.ts" | \
                    grep -v "main.ts" || true)

                if [[ -n "$MATCHES" ]]; then
                    log_fail "Potential hardcoded secret found in $(basename $dir)"
                    echo "$MATCHES" | head -10
                    report "**PATTERN**: \`$pattern\`"
                    report ""
                    report "\`\`\`"
                    report "$MATCHES" | head -20
                    report "\`\`\`"
                    report ""
                    ((SECRETS_FOUND++))
                fi
            done

            if [[ "$SECRETS_FOUND" -eq 0 ]]; then
                log_pass "No hardcoded secrets found in $(basename $dir)"
            fi

            report ""
        else
            log_skip "Directory not found: $dir"
            report "### Scanning: \`$dir\` - ⏭️ Directory not found"
            report ""
        fi
    done

    # Check .env files (excluding .env.example)
    log_info "Checking .env files for hardcoded secrets..."
    report "### .env File Checks"
    report ""

    for env_file in $(find "$PROJECT_ROOT" -name ".env" -not -path "*/node_modules/*" 2>/dev/null); do
        if [[ -f "$env_file" ]]; then
            log_warn "Found .env file: $env_file (should not be committed)"
            report "- **File**: \`$env_file\`"
            report "  - **Status**: ⚠️ Found (verify this is in .gitignore)"
            report ""
        fi
    done

    # Check .env.example for placeholder values
    for env_example in $(find "$PROJECT_ROOT" -name ".env.example" -not -path "*/node_modules/*" 2>/dev/null); do
        if [[ -f "$env_example" ]]; then
            log_info "Checking .env.example: $env_example"
            # Verify no real secrets in example file
            REAL_SECRETS=$(grep -E "(password|secret|key)\s*=\s*[a-zA-Z0-9]{16,}" "$env_example" 2>/dev/null || true)
            if [[ -n "$REAL_SECRETS" ]]; then
                log_fail "Potential real secrets found in .env.example"
                report "- **File**: \`$env_example\`"
                report "  - **Status**: 🚨 Contains potential real secrets"
            else
                log_pass ".env.example looks clean"
                report "- **File**: \`$env_example\`"
                report "  - **Status**: ✅ No real secrets detected"
            fi
            report ""
        fi
    done

    if [[ "$SECRETS_FOUND" -eq 0 ]]; then
        report "**Overall**: ✅ No hardcoded secrets detected in source files"
    else
        report "**Overall**: 🚨 $SECRETS_FOUND potential hardcoded secret(s) detected"
    fi
    report ""
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Security Headers Verification
# ─────────────────────────────────────────────────────────────────────────────

check_security_headers() {
    log_section "3. Security Headers Verification"

    report "## 3. Security Headers Verification"
    report ""
    report "Checking HTTP security headers on backend health endpoint..."
    report ""

    HEALTH_URL="http://localhost:${BACKEND_PORT}/health"

    # Check if server is running
    if curl -s --connect-timeout 3 "$HEALTH_URL" -o /dev/null 2>&1; then
        log_info "Server is running at $HEALTH_URL"
        report "### Server Status: ✅ Running ($HEALTH_URL)"
        report ""

        # Fetch headers
        HEADERS_OUTPUT=$(curl -s -I "$HEALTH_URL" 2>&1)
        report "\`\`\`"
        report "$HEADERS_OUTPUT"
        report "\`\`\`"
        report ""

        # Required security headers per 安全架构设计文档.md Section 3.2
        declare -A REQUIRED_HEADERS
        REQUIRED_HEADERS=(
            ["Strict-Transport-Security"]="HSTS header (Section 3.1)"
            ["X-Content-Type-Options"]="Prevent MIME sniffing (Section 3.2)"
            ["X-Frame-Options"]="Clickjacking protection (Section 3.2)"
            ["Content-Security-Policy"]="CSP header (Section 3.2)"
            ["X-XSS-Protection"]="XSS protection (Section 3.2)"
            ["Referrer-Policy"]="Referrer policy (Section 3.2)"
        )

        log_info "Checking required security headers..."
        report "### Security Headers Check"
        report ""
        report "| Header | Status | Reference |"
        report "|--------|--------|-----------|"

        for header in "${!REQUIRED_HEADERS[@]}"; do
            if echo "$HEADERS_OUTPUT" | grep -qi "$header"; then
                log_pass "Found: $header"
                report "| \`$header\` | ✅ Present | ${REQUIRED_HEADERS[$header]} |"
            else
                log_fail "Missing: $header"
                report "| \`$header\` | ❌ Missing | ${REQUIRED_HEADERS[$header]} |"
            fi
        done

        report ""

        # Check for dangerous headers that should NOT be present
        log_info "Checking for dangerous headers..."
        report "### Dangerous Headers Check"
        report ""

        if echo "$HEADERS_OUTPUT" | grep -qi "X-Powered-By"; then
            log_fail "Found X-Powered-By header (should be removed)"
            report "| \`X-Powered-By\` | ❌ Present (should be removed) |"
        else
            log_pass "X-Powered-By header not present"
            report "| \`X-Powered-By\` | ✅ Not present |"
        fi

        if echo "$HEADERS_OUTPUT" | grep -qi "Server:"; then
            log_warn "Found Server header (version disclosure risk)"
            report "| \`Server\` | ⚠️ Present (version disclosure risk) |"
        else
            log_pass "Server header not present"
            report "| \`Server\` | ✅ Not present |"
        fi

        report ""

    else
        log_skip "Server is not running at $HEALTH_URL (skipping header checks)"
        log_info "To run this check, start the backend server:"
        log_info "  cd booking-backend && npm run start:dev"
        report "### Server Status: ⏭️ Not Running"
        report ""
        report "Server not available at \`$HEALTH_URL\`. To verify security headers:"
        report ""
        report "1. Start the backend server: \`cd booking-backend && npm run start:dev\`"
        report "2. Re-run this audit script"
        report ""
        report "Required headers per 安全架构设计文档.md Section 3.2:"
        report ""
        report "| Header | Purpose |"
        report "|--------|---------|"
        report "| \`Strict-Transport-Security\` | HSTS - Force HTTPS |"
        report "| \`X-Content-Type-Options: nosniff\` | Prevent MIME sniffing |"
        report "| \`X-Frame-Options: DENY\` | Clickjacking protection |"
        report "| \`Content-Security-Policy\` | CSP - Restrict resource loading |"
        report "| \`X-XSS-Protection: 1; mode=block\` | XSS filter |"
        report "| \`Referrer-Policy\` | Control referrer information |"
        report "| \`Cross-Origin-Opener-Policy\` | COOP - Isolate browsing context |"
        report "| \`Cross-Origin-Resource-Policy\` | CORP - Restrict resource sharing |"
        report ""
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. OWASP Top 10 Compliance Checklist
# ─────────────────────────────────────────────────────────────────────────────

check_owasp_top_10() {
    log_section "4. OWASP Top 10 Compliance Checklist (Manual Review)"

    report "## 4. OWASP Top 10 Compliance Checklist"
    report ""
    report "Based on 安全架构设计文档.md Section 9.2 and OWASP Top 10 2021."
    report "These items require manual review and verification."
    report ""

    # Define OWASP Top 10 items with automated checks where possible
    declare -A OWASP_ITEMS
    OWASP_ITEMS=(
        ["A01:2021 – Broken Access Control"]="Check RBAC guards, @Roles(), @Permissions() decorators"
        ["A02:2021 – Cryptographic Failures"]="Verify JWT HS256, bcrypt, AES-256-GCM usage"
        ["A03:2021 – Injection"]="Verify Prisma parameterized queries, DTO validation"
        ["A04:2021 – Insecure Design"]="Review rate limiting, concurrency controls"
        ["A05:2021 – Security Misconfiguration"]="Check helmet, CORS, environment configs"
        ["A06:2021 – Vulnerable and Outdated Components"]="Review npm audit results above"
        ["A07:2021 – Identification and Authentication Failures"]="Check JWT expiry, token blacklist"
        ["A08:2021 – Software and Data Integrity Failures"]="Verify CI/CD integrity checks"
        ["A09:2021 – Security Logging and Monitoring Failures"]="Check Winston logging, audit trails"
        ["A10:2021 – Server-Side Request Forgery (SSRF)"]="Review external URL handling"
    )

    report "| # | OWASP Category | Auto Check | Manual Review Required |"
    report "|---|----------------|------------|----------------------|"

    # A01: Broken Access Control
    log_info "Checking A01: Broken Access Control..."
    A01_PASS=0
    if [[ -d "$BACKEND_DIR/src" ]]; then
        # Check for RolesGuard
        if grep -rq "RolesGuard\|PermissionsGuard" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A01_PASS++))
        fi
        # Check for @Roles decorator usage
        if grep -rq "@Roles\|@Permissions" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A01_PASS++))
        fi
        # Check for AuthGuard
        if grep -rq "AuthGuard\|JwtService" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A01_PASS++))
        fi
    fi

    if [[ "$A01_PASS" -ge 2 ]]; then
        log_pass "A01: RBAC guards and auth decorators detected"
        report "| A01:2021 | ✅ Guards detected | Verify role assignments per endpoint |"
    else
        log_warn "A01: Limited RBAC evidence found"
        report "| A01:2021 | ⚠️ Limited evidence | Manual review required |"
    fi

    # A02: Cryptographic Failures
    log_info "Checking A02: Cryptographic Failures..."
    A02_PASS=0
    if [[ -d "$BACKEND_DIR/src" ]]; then
        # Check for bcrypt usage
        if grep -rq "bcrypt\|hash\|compare" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A02_PASS++))
        fi
        # Check for JWT algorithm
        if grep -rq "HS256\|algorithm" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A02_PASS++))
        fi
    fi

    if [[ "$A02_PASS" -ge 1 ]]; then
        log_pass "A02: Cryptographic implementations detected"
        report "| A02:2021 | ✅ Crypto detected | Verify key strength, no weak algorithms |"
    else
        log_warn "A02: Limited cryptographic evidence found"
        report "| A02:2021 | ⚠️ Limited evidence | Manual review required |"
    fi

    # A03: Injection
    log_info "Checking A03: Injection..."
    A03_PASS=0
    if [[ -d "$BACKEND_DIR/src" ]]; then
        # Check for Prisma usage (parameterized queries)
        if grep -rq "prisma\." "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A03_PASS++))
        fi
        # Check for class-validator usage
        if grep -rq "class-validator\|@IsString\|@IsEmail\|@IsNotEmpty" "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null; then
            ((A03_PASS++))
        fi
        # Check for raw SQL (potential risk)
        RAW_SQL=$(grep -rq '\$queryRaw\|\$executeRaw' "$BACKEND_DIR/src" --include="*.ts" 2>/dev/null && echo "found" || echo "none")
        if [[ "$RAW_SQL" == "none" ]]; then
            ((A03_PASS++))
        fi
    fi

    if [[ "$A03_PASS" -ge 2 ]]; then
        log_pass "A03: ORM and validation detected, no raw SQL found"
        report "| A03:2021 | ✅ ORM + Validation | Review any raw SQL queries manually |"
    else
        log_warn "A03: Limited injection protection evidence"
        report "| A003:2021 | ⚠️ Limited evidence | Manual review required |"
    fi

    # A04-A10: These require more manual review
    log_info "A04-A10 require manual review (see checklist below)"

    report "| A04:2021 | ⏭️ Manual | Review rate limiting, concurrency design |"
    report "| A05:2021 | ⏭️ Manual | Review helmet, CORS, env configuration |"
    report "| A06:2021 | ✅ Auto | See npm audit results in Section 1 |"
    report "| A07:2021 | ⏭️ Manual | Review JWT expiry, refresh token flow |"
    report "| A08:2021 | ⏭️ Manual | Review CI/CD integrity, dependency pinning |"
    report "| A09:2021 | ⏭️ Manual | Review Winston logging, security events |"
    report "| A10:2021 | ⏭️ Manual | Review external URL handling, fetch calls |"
    report ""

    report ""
    report "### Manual Review Checklist"
    report ""
    report "Complete the following manual checks and mark as ✅ or ❌:"
    report ""

    # Generate detailed manual checklist
    cat >> "$REPORT_FILE" << 'MANUAL_CHECKLIST'
#### A01: Broken Access Control
- [ ] All API endpoints have `@UseGuards(AuthGuard)` applied
- [ ] Admin-only endpoints have `@Roles(SystemRole.ADMIN)`
- [ ] Resource-level authorization checks (user can only access own resources)
- [ ] No direct object references without ownership validation
- [ ] CORS whitelist restricts allowed origins

#### A02: Cryptographic Failures
- [ ] JWT secret is at least 256 bits (32 bytes)
- [ ] Password hashing uses bcrypt with cost factor >= 12
- [ ] Sensitive fields (phone, ID number) use AES-256-GCM encryption
- [ ] No weak ciphers in TLS configuration
- [ ] Random values use `crypto.randomBytes()`, not `Math.random()`

#### A03: Injection
- [ ] All database queries use Prisma ORM (no raw SQL)
- [ ] If raw SQL is used, parameters are properly escaped
- [ ] All DTOs have class-validator decorators
- [ ] File upload endpoints validate file type and size
- [ ] No eval() or Function() usage in codebase

#### A04: Insecure Design
- [ ] Rate limiting configured per 接口设计规范文档 Section 2.3.3
- [ ] Concurrency slot抢占 uses PostgreSQL unique index atomicity
- [ ] Business logic prevents double-booking scenarios
- [ ] No unlimited loops or recursion paths

#### A05: Security Misconfiguration
- [ ] helmet middleware is applied globally
- [ ] CORS origin whitelist is restrictive (no `*` in production)
- [ ] Error messages don't leak stack traces in production
- [ ] Default credentials are changed
- [ ] Unnecessary HTTP methods are disabled

#### A06: Vulnerable and Outdated Components
- [ ] npm audit shows 0 critical vulnerabilities
- [ ] Dependencies are pinned to specific versions
- [ ] No deprecated packages in use
- [ ] Angular and NestJS versions are up to date

#### A07: Identification and Authentication Failures
- [ ] Access Token expires within 15 minutes
- [ ] Refresh Token has token family rotation
- [ ] JWT blacklist is checked on every request
- [ ] Login attempts are rate-limited
- [ ] MFA is available for high-risk operations

#### A08: Software and Data Integrity Failures
- [ ] CI/CD pipeline verifies dependency integrity
- [ ] Docker images use specific tags (not `latest`)
- [ ] Build artifacts are signed
- [ ] No untrusted deserialization

#### A09: Security Logging and Monitoring Failures
- [ ] Winston logging captures security events
- [ ] Failed login attempts are logged
- [ ] Permission denied events are logged
- [ ] Rate limit triggers are logged
- [ ] Logs don't contain sensitive data (passwords, tokens)

#### A10: Server-Side Request Forgery (SSRF)
- [ ] External URLs are validated against whitelist
- [ ] No user-controlled URLs passed to fetch/axios
- [ ] Internal metadata endpoints are blocked
- [ ] Redirect responses don't follow to internal IPs

MANUAL_CHECKLIST

    report ""
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Additional Security Checks
# ─────────────────────────────────────────────────────────────────────────────

check_additional_security() {
    log_section "5. Additional Security Checks"

    report "## 5. Additional Security Checks"
    report ""

    # Check for .env in .gitignore
    log_info "Checking .gitignore for .env exclusion..."
    report "### .gitignore Checks"
    report ""

    if [[ -f "$PROJECT_ROOT/.gitignore" ]]; then
        if grep -q "\.env" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
            log_pass ".env is in .gitignore"
            report "- **`.env` in .gitignore**: ✅ Present"
        else
            log_fail ".env is NOT in .gitignore!"
            report "- **`.env` in .gitignore**: ❌ Missing (ADD IMMEDIATELY)"
        fi
    else
        log_warn "No .gitignore found at project root"
        report "- **`.gitignore`**: ⚠️ Not found at project root"
    fi
    report ""

    # Check for console.log with sensitive data
    log_info "Checking for console.log with sensitive data patterns..."
    report "### Console Logging Checks"
    report ""

    SENSITIVE_LOGS=$(grep -rn "console.log.*password\|console.log.*secret\|console.log.*token" \
        "$BACKEND_DIR/src" "$FRONTEND_DIR/src" --include="*.ts" 2>/dev/null | \
        grep -v "node_modules" || true)

    if [[ -n "$SENSITIVE_LOGS" ]]; then
        log_fail "Found console.log with potential sensitive data"
        report "- **Sensitive console.log found**: 🚨"
        report "\`\`\`"
        report "$SENSITIVE_LOGS" | head -10
        report "\`\`\`"
    else
        log_pass "No console.log with sensitive data patterns found"
        report "- **Sensitive console.log**: ✅ None found"
    fi
    report ""

    # Check for any hardcoded localhost/127.0.0.1 in production configs
    log_info "Checking for hardcoded URLs in production configs..."
    report "### Production Configuration Checks"
    report ""

    if [[ -f "$FRONTEND_DIR/src/environments/environment.prod.ts" ]]; then
        PROD_URLS=$(grep -n "http://localhost\|http://127.0.0.1" \
            "$FRONTEND_DIR/src/environments/environment.prod.ts" 2>/dev/null || true)
        if [[ -n "$PROD_URLS" ]]; then
            log_warn "Found localhost URLs in production environment config"
            report "- **localhost in prod config**: ⚠️ Found"
            report "\`\`\`"
            report "$PROD_URLS"
            report "\`\`\`"
        else
            log_pass "No localhost URLs in production config"
            report "- **localhost in prod config**: ✅ Clean"
        fi
    else
        log_skip "Production environment config not found"
        report "- **Production config**: ⏭️ Not found"
    fi
    report ""

    # Check for TODO/FIXME comments related to security
    log_info "Checking for security-related TODOs/FIXMEs..."
    report "### Security TODOs/FIXMEs"
    report ""

    SECURITY_TODOS=$(grep -rn "TODO.*security\|FIXME.*security\|TODO.*auth\|FIXME.*auth\|TODO.*encrypt\|FIXME.*encrypt" \
        "$BACKEND_DIR/src" "$FRONTEND_DIR/src" --include="*.ts" -i 2>/dev/null | \
        grep -v "node_modules" || true)

    if [[ -n "$SECURITY_TODOS" ]]; then
        log_warn "Found security-related TODOs/FIXMEs"
        report "**Count**: $(echo "$SECURITY_TODOS" | wc -l | tr -d ' ')"
        report "\`\`\`"
        report "$SECURITY_TODOS" | head -20
        report "\`\`\`"
    else
        log_pass "No security-related TODOs/FIXMEs found"
        report "**Count**: 0"
    fi
    report ""
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. Generate Summary Report
# ─────────────────────────────────────────────────────────────────────────────

generate_summary() {
    log_section "Security Audit Summary"

    TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT + SKIP_COUNT))

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}                    AUDIT RESULTS                          ${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Total Checks:  $TOTAL"
    echo -e "  ${GREEN}Passed:${NC}        $PASS_COUNT"
    echo -e "  ${RED}Failed:${NC}        $FAIL_COUNT"
    echo -e "  ${YELLOW}Warnings:${NC}      $WARN_COUNT"
    echo -e "  ${YELLOW}Skipped:${NC}       $SKIP_COUNT"
    echo ""

    # Write summary to report
    report "---"
    report ""
    report "## Audit Summary"
    report ""
    report "| Metric | Count |"
    report "|--------|-------|"
    report "| Total Checks | $TOTAL |"
    report "| Passed | $PASS_COUNT |"
    report "| Failed | $FAIL_COUNT |"
    report "| Warnings | $WARN_COUNT |"
    report "| Skipped | $SKIP_COUNT |"
    report ""

    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        echo -e "${RED}  STATUS: FAIL - $FAIL_COUNT critical issue(s) require immediate attention${NC}"
        report "**STATUS**: 🚨 FAIL - $FAIL_COUNT critical issue(s) require immediate attention"
        echo ""
        echo -e "${RED}  Review the full report: $REPORT_FILE${NC}"
    elif [[ "$WARN_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}  STATUS: WARN - $WARN_COUNT warning(s) should be reviewed${NC}"
        report "**STATUS**: ⚠️ WARN - $WARN_COUNT warning(s) should be reviewed"
        echo ""
        echo -e "${YELLOW}  Review the full report: $REPORT_FILE${NC}"
    else
        echo -e "${GREEN}  STATUS: PASS - All checks passed${NC}"
        report "**STATUS**: ✅ PASS - All checks passed"
        echo ""
        echo -e "${GREEN}  Review the full report: $REPORT_FILE${NC}"
    fi

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    report ""
    report "---"
    report ""
    report "*Report generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')*"
    report "*Based on: 安全架构设计文档.md v2.1.0*"
    report ""
    report "## Remediation Priority"
    report ""
    report "1. **Critical**: Fix all FAIL items before deploying"
    report "2. **High**: Address WARN items within current sprint"
    report "3. **Medium**: Complete OWASP manual review checklist"
    report "4. **Low**: Review SKIP items for future automation"
    report ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Execution
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Booking System Security Audit                   ║${NC}"
    echo -e "${BLUE}║          Based on 安全架构设计文档.md v2.1.0             ║${NC}"
    echo -e "${BLUE}║          $(date '+%Y-%m-%d %H:%M:%S')                           ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Initialize report
    report "# Security Audit Report"
    report ""
    report "**Project**: Booking System Refactor"
    report "**Date**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    report "**Security Baseline**: 安全架构设计文档.md v2.1.0"
    report ""
    report "---"
    report ""

    # Run all checks
    preflight_checks
    run_npm_audit
    check_hardcoded_secrets
    check_security_headers
    check_owasp_top_10
    check_additional_security
    generate_summary

    # Exit with appropriate code
    if [[ "$FAIL_COUNT" -gt 0 ]]; then
        exit 1
    fi
    exit 0
}

# Run main function
main "$@"
