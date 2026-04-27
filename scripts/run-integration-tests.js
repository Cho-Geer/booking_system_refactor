const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..', 'booking-backend');

function runCommand(command, options = {}) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Running: ${command}`);
  console.log('='.repeat(80));
  
  try {
    const result = execSync(command, {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 600000, // 10 minutes default
    });
    return { success: true, output: result?.toString() || '' };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout?.toString() || '',
      error: error.stderr?.toString() || error.message 
    };
  }
}

async function main() {
  console.log('Starting Backend Integration Test Runner');
  console.log(`Working directory: ${BACKEND_DIR}`);
  
  // Step 1: Check if node_modules exists
  const nodeModulesPath = path.join(BACKEND_DIR, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('\nnode_modules not found. Installing dependencies...');
    const installResult = runCommand('npm install', { timeout: 300000 });
    if (!installResult.success) {
      console.error('Failed to install dependencies:', installResult.error);
      process.exit(1);
    }
    console.log('Dependencies installed successfully.');
  } else {
    console.log('node_modules already exists. Skipping install.');
  }
  
  // Step 2: Generate Prisma client
  console.log('\nGenerating Prisma client...');
  const prismaResult = runCommand('npx prisma generate');
  if (!prismaResult.success) {
    console.error('Failed to generate Prisma client:', prismaResult.error);
    process.exit(1);
  }
  console.log('Prisma client generated successfully.');
  
  // Step 3: Run integration tests
  console.log('\nRunning integration tests...');
  console.log('This may take 2-5 minutes as TestContainers will spin up PostgreSQL and Redis.');
  
  const testResult = runCommand('npm run test:integration', { 
    timeout: 600000,
    env: {
      TESTCONTAINERS_RYUK_DISABLED: 'true', // Prevent RYUK from interfering
    }
  });
  
  // Step 4: Report results
  console.log('\n\n' + '='.repeat(80));
  console.log('TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  
  if (testResult.success) {
    console.log('STATUS: ALL TESTS PASSED');
  } else {
    console.log('STATUS: SOME TESTS FAILED');
    console.log('\nError output:');
    console.log(testResult.error || 'See above for details');
  }
  
  // Check coverage directory
  const coverageDir = path.join(BACKEND_DIR, 'coverage-integration');
  if (fs.existsSync(coverageDir)) {
    console.log('\nCoverage report generated in:', coverageDir);
    const coverageJsonPath = path.join(coverageDir, 'coverage-summary.json');
    if (fs.existsSync(coverageJsonPath)) {
      const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
      const total = coverageData.total;
      console.log('\nTest Coverage Summary:');
      console.log(`  Lines:      ${total.lines.pct}%`);
      console.log(`  Statements: ${total.statements.pct}%`);
      console.log(`  Branches:   ${total.branches.pct}%`);
      console.log(`  Functions:  ${total.functions.pct}%`);
    }
  }
  
  // Check for container cleanup
  console.log('\nChecking Docker container status...');
  try {
    const containers = execSync('docker ps -a --filter "name=postgres" --filter "name=redis" --format "{{.Names}} - {{.Status}}"', { encoding: 'utf8' });
    console.log('Containers:');
    console.log(containers || 'No matching containers found');
  } catch (e) {
    console.log('Docker not available or no containers found');
  }
  
  process.exit(testResult.success ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
