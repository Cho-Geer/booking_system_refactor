# Security Audit Setup Instructions

## Adding `audit:security` npm Script

### Option 1: Root package.json (Recommended)

If you add a root `package.json` for workspace management, add this script:

```json
{
  "name": "booking-system",
  "private": true,
  "scripts": {
    "audit:security": "bash scripts/security-audit.sh",
    "audit:backend": "cd booking-backend && npm audit",
    "audit:frontend": "cd booking-frontend && npm audit",
    "audit:all": "npm run audit:backend && npm run audit:frontend"
  }
}
```

Then run:
```bash
npm run audit:security
```

### Option 2: Backend package.json

Add to `booking-backend/package.json`:

```json
{
  "scripts": {
    "audit:security": "bash ../scripts/security-audit.sh"
  }
}
```

Then run:
```bash
cd booking-backend
npm run audit:security
```

### Option 3: Direct Execution

```bash
cd booking_system_refactor
./scripts/security-audit.sh
```

## CI/CD Integration

Add to your GitHub Actions workflow (`.github/workflows/security-audit.yml`):

```yaml
name: Security Audit

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM
  pull_request:
    branches: [main, master]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install backend dependencies
        run: cd booking-backend && npm ci

      - name: Install frontend dependencies
        run: cd booking-frontend && npm ci

      - name: Run security audit
        run: |
          chmod +x scripts/security-audit.sh
          ./scripts/security-audit.sh || true

      - name: Upload security report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-audit-report
          path: scripts/security-audit-report-*.md
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `./scripts/security-audit.sh` | Run full security audit |
| `BACKEND_PORT=3000 ./scripts/security-audit.sh` | Run with custom backend port |
| `npm audit` (in backend/) | Quick backend dependency check |
| `npm audit` (in frontend/) | Quick frontend dependency check |
| `npm audit --audit-level=critical` | Check only critical vulnerabilities |

## Report Output

After running the audit, a markdown report will be generated at:
```
scripts/security-audit-report-YYYYMMDD-HHMMSS.md
```

This report contains:
1. Dependency vulnerability scan results
2. Hardcoded secrets detection results
3. Security headers verification (if server is running)
4. OWASP Top 10 compliance checklist
5. Additional security checks
6. Summary with pass/fail/warn counts
