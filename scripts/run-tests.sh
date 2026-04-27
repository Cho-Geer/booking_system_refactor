#!/bin/bash
set -e

echo "============================================================"
echo "Integration Test Runner for Booking Backend"
echo "============================================================"

BACKEND_DIR="./../booking-backend"
cd "$BACKEND_DIR"

# Step 1: Install dependencies
echo ""
echo "Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "node_modules already exists. Skipping install."
fi

# Step 2: Generate Prisma client
echo ""
echo "Step 2: Generating Prisma client..."
npx prisma generate

# Step 3: Run integration tests
echo ""
echo "Step 3: Running integration tests..."
echo "This may take 2-5 minutes as TestContainers will spin up PostgreSQL and Redis."
echo ""

npm run test:integration 2>&1 | tee /tmp/test-output.log
TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "============================================================"
echo "TEST EXECUTION SUMMARY"
echo "============================================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "STATUS: ALL TESTS PASSED"
else
  echo "STATUS: SOME TESTS FAILED (exit code: $TEST_EXIT_CODE)"
fi

# Check coverage
if [ -d "coverage-integration" ]; then
  echo ""
  echo "Coverage report generated in: coverage-integration"
  if [ -f "coverage-integration/coverage-summary.json" ]; then
    echo ""
    echo "Test Coverage Summary:"
    node -e "
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync('coverage-integration/coverage-summary.json', 'utf8'));
      const total = data.total;
      console.log('  Lines:      ' + total.lines.pct + '%');
      console.log('  Statements: ' + total.statements.pct + '%');
      console.log('  Branches:   ' + total.branches.pct + '%');
      console.log('  Functions:  ' + total.functions.pct + '%');
    "
  fi
fi

# Check container status
echo ""
echo "Docker container status:"
docker ps -a --filter "name=postgres" --filter "name=redis" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "Docker not available or no containers found"

exit $TEST_EXIT_CODE
