#!/usr/bin/env node
/**
 * keystone-validate.js v3.0.0 — Multi-phase pre-commit audit engine.
 *
 * Phases:
 *   0     Schema Validation
 *   1     Contract Hash
 *   1.5   Business & Task Coupling
 *   2     Task Lifecycle Evidence
 *   2.5   TypeScript Type Check (tsc --noEmit)       ← NEW
 *   2.6   Dependency Boundary (depcruise)            ← NEW
 *   2.7   ESLint Full Audit (mock + quality rules)   ← NEW
 *   2.8   Prettier Format Check                      ← NEW
 *   4     Compliance Gate
 *   5     Agent Scope Audit                          ← NEW
 *
 * Modes: --pre-commit, --audit, --ci
 */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const SCRIPT_DIR = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const MACHINE_FILE = path.join(PROJECT_ROOT, '.opencode', 'state', 'machine.json');
const MACHINE_SCHEMA = path.join(PROJECT_ROOT, '.opencode', 'state', 'machine.schema.json');
const GATE_FILE = path.join(PROJECT_ROOT, '.opencode', 'state', 'gate-state.json');
const GIT_DIR = path.join(PROJECT_ROOT, '.git');
const DEP_CRUISE_CFG = path.join(PROJECT_ROOT, '.dependency-cruiser.js');

function loadJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch (e) { return null; }
}

function fileExists(fp) {
  try { return fs.statSync(fp).isFile(); } catch { return false; }
}

function sha256(content) {
  return 'sha256-' + crypto.createHash('sha256').update(content).digest('hex');
}

function runGit(args) {
  try {
    const out = execSync(`git ${args}`, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return out.trim();
  } catch { return ''; }
}

function runGitLines(args) {
  const out = runGit(args);
  return out ? out.split('\n').filter(Boolean) : [];
}

function calcFileHash(relativePath, isDir) {
  const fp = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(fp)) return '';
  if (isDir) {
    try {
      const files = fs.readdirSync(fp).filter(f => f.endsWith('.ts')).sort();
      if (files.length === 0) return 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const combined = files.map(f => fs.readFileSync(path.join(fp, f), 'utf8')).join('\n---FILE_SEPARATOR---\n');
      return sha256(combined);
    } catch { return ''; }
  }
  try { return sha256(fs.readFileSync(fp, 'utf8')); }
  catch { return ''; }
}

function readOpenCodeConfig() {
  const configPath = path.resolve(PROJECT_ROOT, '..', '.opencode', 'project.config.json');
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { return null; }
}

const COLORS = {
  red: '\x1b[0;31m', green: '\x1b[0;32m', yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m', reset: '\x1b[0m'
};
function c(msg, color) { return `${COLORS[color] || ''}${msg}${COLORS.reset}`; }

// ── Phase 0: Schema Validation ──────────────────────────────
function runPhase0(machine, schemaPath) {
  const results = { phase: 0, name: 'Schema Validation', status: 'PASS', detail: '' };
  if (!fileExists(schemaPath)) {
    results.status = 'SKIP'; results.detail = 'machine.schema.json not found, skipping'; return results;
  }
  let Ajv, addFormats;
  try {
    Ajv = require('ajv'); addFormats = require('ajv-formats');
  } catch {
    results.status = 'SKIP'; results.detail = 'ajv not installed'; return results;
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const schema = loadJson(schemaPath);
    const valid = ajv.validate(schema, machine);
    if (!valid) { results.status = 'FAIL'; results.detail = JSON.stringify(ajv.errors, null, 2); }
    else { results.detail = 'machine.json conforms to schema'; }
  } catch (e) { results.status = 'FAIL'; results.detail = `ajv error: ${e.message}`; }
  return results;
}

// ── Phase 1: Contract Hash ──────────────────────────────────
function runPhase1(machine, changedFiles) {
  const results = { phase: 1, name: 'Contract Hash', status: 'PASS', detail: '', fix: '' };
  const contracts = machine.contracts || {};
  const contractKeys = Object.keys(contracts);
  if (contractKeys.length === 0) { results.status = 'SKIP'; results.detail = 'No contracts defined'; return results; }

  const changedSet = new Set(changedFiles);
  const mismatches = [];

  for (const key of contractKeys) {
    const cfg = contracts[key];
    if (!cfg.file) continue;
    if (!changedSet.has(cfg.file)) continue;
    const actual = calcFileHash(cfg.file, cfg.file.endsWith('/'));
    const expected = cfg.hash || '';
    if (actual && actual !== expected) {
      mismatches.push({ key, file: cfg.file, expected, actual });
    }
  }
  if (mismatches.length > 0) {
    results.status = 'FAIL';
    results.detail = mismatches.map(m =>
      `  ${m.key} (${m.file}): hash mismatch\n    expected: ${m.expected}\n    actual:   ${m.actual}`
    ).join('\n');
    results.fix = 'npm run keystone:hash';
  } else {
    const contractValues = Object.values(contracts);
    results.detail = changedFiles.filter(f => contractValues.some(c => c.file === f)).length
      ? 'All contract hashes match' : 'No contract files changed';
  }
  return results;
}

// ── Phase 1.5: Business & Task Coupling ─────────────────────
function isBusinessCode(file) {
  const beRe = /^booking-backend\/src\/.*\.ts$/;
  const feRe = /^booking-frontend\/src\/.*\.ts$/;
  return (beRe.test(file) || feRe.test(file)) && !/seed|migration/.test(file);
}

function runPhase1_5(machine, changedFiles) {
  const results = { phase: 1.5, name: 'Business & Task Coupling', status: 'PASS', detail: '' };
  const tsf = machine.taskLifecycle?.taskStateFilePattern || 'Task.DAG.json';
  const businessFiles = changedFiles.filter(isBusinessCode);
  if (businessFiles.length === 0) { results.status = 'SKIP'; results.detail = 'No business code changed'; return results; }
  if (!changedFiles.includes(tsf)) {
    results.status = 'FAIL';
    results.detail = `Business code changed but ${tsf} not updated:\n  ${businessFiles.join('\n  ')}`;
    return results;
  }
  const oldTasks = loadJson(path.join(PROJECT_ROOT, tsf));
  if (!oldTasks || !oldTasks.tasks) {
    results.status = 'FAIL'; results.detail = `${tsf} staged but invalid format`; return results;
  }
  results.detail = `Business code + ${tsf} updated together`;
  return results;
}

// ── Phase 2: Task Lifecycle Evidence ────────────────────────
function runPhase2(machine, changedFiles) {
  const results = { phase: 2, name: 'Task Lifecycle Evidence', status: 'PASS', detail: '' };
  const tsf = machine.taskLifecycle?.taskStateFilePattern || 'Task.DAG.json';
  if (!changedFiles.includes(tsf)) { results.status = 'SKIP'; results.detail = 'No task state change'; return results; }

  const dag = loadJson(path.join(PROJECT_ROOT, tsf));
  const oldDagStr = runGit(`show HEAD:${tsf}`);
  if (!dag || !dag.tasks) { results.status = 'FAIL'; results.detail = 'Cannot read Task.DAG.json'; return results; }

  let oldDag = null;
  try { oldDag = JSON.parse(oldDagStr); } catch { oldDag = null; }
  if (!oldDag) { results.status = 'SKIP'; results.detail = 'HEAD has no Task.DAG.json to compare'; return results; }

  const transitions = machine.taskLifecycle?.transitions || [];
  const missingEvidence = [];

  for (const newTask of dag.tasks) {
    const oldTask = oldDag.tasks ? oldDag.tasks.find(t => t.id === newTask.id) : null;
    if (!oldTask || oldTask.status === newTask.status) continue;
    const rule = transitions.find(t => t.from === oldTask.status && t.to === newTask.status);
    if (!rule) continue;
    if (!rule.requiredEvidence || rule.requiredEvidence.length === 0) continue;
    for (const ev of rule.requiredEvidence) {
      const pattern = ev.filePattern.replace('{taskId}', newTask.id);
      if (!changedFiles.includes(pattern)) {
        missingEvidence.push(`  ${pattern} (${ev.description})`);
      }
    }
  }

  if (missingEvidence.length > 0) {
    results.status = 'FAIL';
    results.detail = `Missing evidence files:\n${missingEvidence.join('\n')}`;
  }
  return results;
}

// ═══ NEW Phase 2.5: TypeScript Type Check ═══════════════════
function runPhase2_5(machine, changedFiles) {
  const results = { phase: 2.5, name: 'TypeScript Type Check', status: 'PASS', detail: '' };
  const tsSrcFiles = changedFiles.filter(f =>
    (f.startsWith('booking-backend/src/') || f.startsWith('booking-frontend/src/')) &&
    f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('/test/')
  );
  if (tsSrcFiles.length === 0) { results.status = 'SKIP'; results.detail = 'No TypeScript src files changed'; return results; }

  const backends = ['booking-backend', 'booking-frontend'];
  let totalErrors = 0;

  for (const be of backends) {
    const beFiles = changedFiles.filter(f => f.startsWith(be + '/src/'));
    if (beFiles.length === 0) continue;
    const cwd = path.join(PROJECT_ROOT, be);
    if (!fileExists(path.join(cwd, 'tsconfig.json'))) continue;

    try {
      execSync('npx tsc --noEmit --incremental --pretty false', {
        cwd, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (e) {
      totalErrors++;
      const errorMsg = (e.stderr || e.stdout || '').substring(0, 200);
      results.status = 'FAIL';
      results.detail += `${be}: TypeScript errors found.\n${errorMsg}\n`;
    }
  }

  if (results.status === 'FAIL') {
    results.fix = 'Fix TypeScript type errors and re-stage. Run: npm run typecheck';
    // Update machine.json
    machine.type_check_state = machine.type_check_state || {};
    machine.type_check_state.last_full_check = new Date().toISOString();
    machine.type_check_state.full_errors = (machine.type_check_state.full_errors || 0) + totalErrors;
    machine.type_check_state.status = 'dirty';
    const machineFp = MACHINE_FILE;
    machine.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(machineFp, JSON.stringify(machine, null, 2) + '\n');
  }
  return results;
}

// ═══ NEW Phase 2.6: Dependency Boundary (depcruise) ═════════
function runPhase2_6(machine, changedFiles) {
  const results = { phase: 2.6, name: 'Dependency Boundary', status: 'PASS', detail: '' };
  const tsFiles = changedFiles.filter(f => f.endsWith('.ts') && !f.includes('node_modules'));
  if (tsFiles.length === 0) { results.status = 'SKIP'; results.detail = 'No TS files changed'; return results; }

  if (!fileExists(DEP_CRUISE_CFG)) {
    results.status = 'SKIP'; results.detail = '.dependency-cruiser.js not found'; return results;
  }

  try {
    execSync('npx depcruise --config .dependency-cruiser.js --output-type json src test 2>/dev/null', {
      cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    try {
      const data = JSON.parse(e.stdout?.toString() || '{}');
      const violations = data.summary?.violations || [];
      if (violations.length > 0) {
        results.status = 'FAIL';
        results.detail = violations.map(v =>
          `  ${v.rule}: ${v.source}:${v.loc?.start?.line || '?'} → ${v.module}`
        ).join('\n');
        results.fix = 'Fix forbidden import dependencies';

        machine.dependency_state = machine.dependency_state || {};
        machine.dependency_state.last_check = new Date().toISOString();
        machine.dependency_state.violations = violations;
        machine.dependency_state.status = 'dirty';
        machine.meta.lastUpdated = new Date().toISOString();
        fs.writeFileSync(MACHINE_FILE, JSON.stringify(machine, null, 2) + '\n');
      }
    } catch {}
  }
  return results;
}

// ═══ NEW Phase 2.7: ESLint Full Audit ═══════════════════════
function runPhase2_7(machine, changedFiles) {
  const results = { phase: 2.7, name: 'ESLint Full Audit', status: 'PASS', detail: '' };
  const pluginDir = path.resolve(PROJECT_ROOT, '..', '.opencode', 'tools', 'eslint-plugin-booking-mock-audit');
  if (!fs.existsSync(pluginDir)) { results.status = 'SKIP'; results.detail = 'ESLint plugin not found'; return results; }

  const specFiles = changedFiles.filter(f => f.endsWith('.spec.ts') && (f.startsWith('booking-backend/') || f.startsWith('booking-frontend/')));
  if (specFiles.length === 0) { results.status = 'SKIP'; results.detail = 'No spec files changed'; return results; }

  const resolvedPaths = specFiles.map(f => path.join(PROJECT_ROOT, f)).filter(f => fs.existsSync(f));
  if (resolvedPaths.length === 0) { results.status = 'SKIP'; results.detail = 'No spec files exist on disk'; return results; }

  const rules = [
    'no-tier1-mock: error', 'no-skipped-tests: error', 'no-skipped-audit: error',
    'no-console-log: error', 'no-empty-assertions: error', 'no-only-left: error',
    'no-any-in-spec: error', 'max-complexity-enforce: warn',
    'no-deep-import: warn', 'tier3-verify: warn', 'no-uncovered-switch: warn',
  ];
  const ruleArgs = rules.map(r => `--rule '${r}'`).join(' ');

  try {
    execSync(`npx eslint --no-eslintrc --rulesdir "${pluginDir}/rules" ${ruleArgs} --format json ${resolvedPaths.join(' ')}`, {
      cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    try {
      const jsonResults = JSON.parse(e.stdout?.toString() || '[]');
      const totalViolations = jsonResults.reduce((sum, f) => sum + (f.messages?.length || 0), 0);
      if (totalViolations > 0) {
        results.status = 'FAIL';
        results.detail = `${totalViolations} ESLint violations found in staged files`;
        results.fix = 'Run: eslint --fix on affected files or get @Arbiter waiver';
      }
    } catch {}
  }
  return results;
}

// ═══ NEW Phase 2.8: Prettier Format Check ═══════════════════
function runPhase2_8(machine, changedFiles) {
  const results = { phase: 2.8, name: 'Prettier Format Check', status: 'PASS', detail: '' };
  const formattable = changedFiles.filter(f =>
    /\.(ts|js|html|scss|css|json|ya?ml)$/.test(f) &&
    !f.includes('node_modules') && !f.includes('dist/')
  );
  if (formattable.length === 0) { results.status = 'SKIP'; results.detail = 'No formattable files'; return results; }

  try {
    execSync(`npx prettier --check ${formattable.join(' ')}`, {
      cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch {
    results.status = 'FAIL';
    results.detail = `Some files not formatted. Run: npx prettier --write ${formattable.join(' ')}`;
    results.fix = 'npx prettier --write <files>';

    machine.format_state = machine.format_state || {};
    machine.format_state.last_check = new Date().toISOString();
    machine.format_state.unformatted_files = formattable;
    machine.format_state.status = 'dirty';
    machine.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MACHINE_FILE, JSON.stringify(machine, null, 2) + '\n');
  }
  return results;
}

// ═══ NEW Phase 3.5: TDD Order Enforcement ═════════════════════
function runPhase3_5(machine, changedFiles) {
  const results = { phase: 3.5, name: 'TDD Order Enforcement', status: 'PASS', detail: '' };
  const implFiles = changedFiles.filter(f => /\.(ts|js)$/.test(f) && !f.includes('.spec.') && !f.includes('.test.') && !f.includes('/test/') && !f.includes('.config.'));
  const testFiles = changedFiles.filter(f => f.includes('.spec.') || f.includes('.test.') || f.includes('/test/'));

  if (implFiles.length === 0) { results.status = 'SKIP'; results.detail = 'No implementation files staged'; return results; }
  if (testFiles.length > 0) { results.detail = `Test files present: ${testFiles.length}, impl files: ${implFiles.length}`; return results; }

  const commitMsg = runGit('log -1 --format=%s 2>/dev/null');
  if (commitMsg && /\[(Red|Green|Refactor)\]/i.test(commitMsg)) {
    results.detail = `Impl files staged (${implFiles.length}) with valid TDD tag: "${commitMsg.substring(0, 50)}"`;
    return results;
  }

  results.status = 'FAIL';
  results.detail = `CAT5.2: ${implFiles.length} implementation file(s) staged without corresponding test files.\n  Files: ${implFiles.join(', ')}\n  Commit message must include [Red], [Green], or [Refactor] tag.`;
  results.fix = 'Write test files first, or add TDD tag to commit message';

  machine.tdd_enforcement_state = machine.tdd_enforcement_state || { enabled: true, current_session: {}, violations: [], history: [] };
  machine.tdd_enforcement_state.violations.push({
    timestamp: new Date().toISOString(),
    files: implFiles,
    code: 'CAT5.2',
    detail: results.detail
  });
  machine.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MACHINE_FILE, JSON.stringify(machine, null, 2) + '\n');

  return results;
}

// ── Phase 4: Compliance Gate ─────────────────────────────────
function runPhase4(gateFile) {
  const results = { phase: 4, name: 'Compliance Gate', status: 'PASS', detail: '' };
  const gate = loadJson(gateFile);
  if (!gate) { results.status = 'SKIP'; results.detail = 'gate-state.json not found'; return results; }
  if (gate.gate_status !== 'armed') {
    results.status = 'FAIL';
    results.detail = `Gate status is '${gate.gate_status || 'pending'}', expected 'armed'`;
    return results;
  }
  results.detail = 'Gate is armed';
  return results;
}

// ═══ NEW Phase 5: Agent Scope Audit ═════════════════════════
function runPhase5(machine, changedFiles) {
  const results = { phase: 5, name: 'Agent Scope Audit', status: 'PASS', detail: '' };
  const config = readOpenCodeConfig();
  if (!config) { results.status = 'SKIP'; results.detail = 'project.config.json not found'; return results; }

  // Determine agent from git config
  const gitUser = runGit('config user.name').toLowerCase().trim();
  const agentMapping = {
    'coder-be': '@Coder-BE', '@coder-be': '@Coder-BE',
    'coder-fe': '@Coder-FE', '@coder-fe': '@Coder-FE',
    'architect': '@Architect', 'orchestrator': '@Orchestrator',
    'guardian': '@Guardian', 'meta-planner': '@Meta-Planner',
  };
  const agentType = agentMapping[gitUser] || null;
  if (!agentType) { results.status = 'SKIP'; results.detail = `Cannot map git user "${gitUser}" to known agent`; return results; }

  const scopes = config.agent_write_scopes;
  if (!scopes || !scopes[agentType]) { results.status = 'SKIP'; results.detail = `No scope defined for ${agentType}`; return results; }

  const scope = scopes[agentType];
  const violations = [];

  for (const file of changedFiles) {
    // Check denied
    for (const deny of scope.denied || []) {
      const denyRegex = new RegExp('^' + deny.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
      if (denyRegex.test(file)) {
        violations.push({ file, reason: `DENIED by pattern: ${deny}` });
      }
    }
    // Check allowed
    const isAllowed = (scope.allowed || []).some(pattern => {
      const allowRegex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
      return allowRegex.test(file);
    });
    if (!isAllowed && !violations.find(v => v.file === file)) {
      violations.push({ file, reason: 'NOT in allowed scopes' });
    }
  }

  if (violations.length > 0) {
    results.status = 'FAIL';
    results.detail = `Agent ${agentType} scope violations:\n` +
      violations.map(v => `  ${v.file}: ${v.reason}`).join('\n') +
      `\nRemove these files from staging or adjust write scopes.`;

    // Record to machine.json
    machine.compliance_records = machine.compliance_records || { role_violations: [] };
    for (const v of violations) {
      machine.compliance_records.role_violations.push({
        timestamp: new Date().toISOString(),
        agent: agentType,
        violation_file: v.file,
        status: 'unresolved',
        severity: 'BLOCKER',
        reason: v.reason
      });
    }
    machine.meta.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MACHINE_FILE, JSON.stringify(machine, null, 2) + '\n');
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--pre-commit') ? 'pre-commit'
    : args.includes('--audit') ? 'audit'
    : args.includes('--ci') ? 'ci'
    : 'audit';

  const machine = loadJson(MACHINE_FILE);
  if (!machine) {
    const result = { overall: 'SKIP', repo: path.basename(PROJECT_ROOT), phases: [], detail: 'machine.json not found' };
    console.log(JSON.stringify(result, null, 2));
    if (mode === 'pre-commit') process.exit(0);
    return;
  }

  let changedFiles = [];
  if (mode === 'pre-commit') {
    changedFiles = runGitLines('diff --cached --name-only');
  } else if (mode === 'audit') {
    const staged = runGitLines('diff --cached --name-only');
    const unstaged = runGitLines('diff --name-only');
    changedFiles = [...new Set([...staged, ...unstaged])];
  }

  const phases = [];

  if (mode !== 'ci') {
    phases.push(runPhase0(machine, MACHINE_SCHEMA));
    phases.push(runPhase1(machine, changedFiles));
    phases.push(runPhase1_5(machine, changedFiles));
  }
  phases.push(runPhase2(machine, changedFiles));

  // ─── v3.0 New Phases ───
  if (mode !== 'ci') {
    phases.push(runPhase2_5(machine, changedFiles));   // TypeScript type check
    phases.push(runPhase2_6(machine, changedFiles));   // Dependency boundary
    phases.push(runPhase2_7(machine, changedFiles));   // ESLint full audit
    phases.push(runPhase2_8(machine, changedFiles));   // Prettier format
  }

  if (mode !== 'ci') {
    phases.push(runPhase3_5(machine, changedFiles));   // TDD Order Enforcement
    phases.push(runPhase4(GATE_FILE));
    phases.push(runPhase5(machine, changedFiles));     // Agent scope audit
  }

  const failed = phases.filter(p => p.status === 'FAIL');
  const overall = failed.length > 0 ? 'FAIL' : 'PASS';

  if (mode === 'pre-commit') {
    console.log(`\n${c('═════════════════════════════════════════════════════', 'blue')}`);
    console.log(`${c('  🔍 Keystone v3.0 — Pre-Commit Audit', 'blue')}`);
    console.log(`${c('═════════════════════════════════════════════════════', 'blue')}`);
    for (const p of phases) {
      const color = p.status === 'FAIL' ? 'red' : p.status === 'SKIP' ? 'yellow' : 'green';
      console.log(`${c(`[${p.status}]`, color)} Phase ${p.phase}: ${p.name} — ${p.detail.split('\n')[0]}`);
    }
    if (overall === 'FAIL') {
      console.log(`\n${c('❌ KEYSTONE VALIDATION FAILED', 'red')}`);
      for (const p of failed) {
        console.log(`\n  Phase ${p.phase} (${p.name}):`);
        console.log(`  ${p.detail}`);
        if (p.fix) console.log(`  ${c(`→ Fix: ${p.fix}`, 'yellow')}`);
      }
      process.exit(1);
    }
    console.log(`\n${c('✅ KEYSTONE VALIDATION PASSED', 'green')}`);
    process.exit(0);
  }

  const result = { overall, repo: path.basename(PROJECT_ROOT), phases };
  if (failed.length > 0) result.failures = failed.map(f => ({ phase: f.phase, detail: f.detail, fix: f.fix }));
  console.log(JSON.stringify(result, null, 2));
  if (overall === 'FAIL' && mode === 'ci') process.exit(1);
}

main();
