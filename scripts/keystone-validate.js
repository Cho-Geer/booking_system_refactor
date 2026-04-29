#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const MACHINE_FILE = path.join(PROJECT_ROOT, '.opencode', 'state', 'machine.json');
const MACHINE_SCHEMA = path.join(PROJECT_ROOT, '.opencode', 'state', 'machine.schema.json');
const GATE_FILE = path.join(PROJECT_ROOT, '.opencode', 'state', 'gate-state.json');
const GIT_DIR = path.join(PROJECT_ROOT, '.git');

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

const COLORS = {
  red: '\x1b[0;31m', green: '\x1b[0;32m', yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m', reset: '\x1b[0m'
};
function c(msg, color) { return `${COLORS[color] || ''}${msg}${COLORS.reset}`; }

function runPhase0(machine, schemaPath) {
  const results = { phase: 0, name: 'Schema Validation', status: 'PASS', detail: '' };
  if (!fileExists(schemaPath)) {
    results.status = 'SKIP';
    results.detail = 'machine.schema.json not found, skipping';
    return results;
  }
  let Ajv, addFormats;
  try {
    Ajv = require('ajv');
    addFormats = require('ajv-formats');
  } catch {
    results.status = 'SKIP';
    results.detail = 'ajv not installed, install with: npm install --save-dev ajv ajv-formats';
    return results;
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const schema = loadJson(schemaPath);
    const valid = ajv.validate(schema, machine);
    if (!valid) {
      results.status = 'FAIL';
      results.detail = JSON.stringify(ajv.errors, null, 2);
    } else {
      results.detail = 'machine.json conforms to schema';
    }
  } catch (e) {
    results.status = 'FAIL';
    results.detail = `ajv error: ${e.message}`;
  }
  return results;
}

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
    results.status = 'FAIL';
    results.detail = `${tsf} staged but invalid format`;
    return results;
  }
  results.detail = `Business code + ${tsf} updated together`;
  return results;
}

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

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--pre-commit') ? 'pre-commit'
    : args.includes('--audit') ? 'audit'
    : args.includes('--ci') ? 'ci'
    : 'audit';

  const machine = loadJson(MACHINE_FILE);
  if (!machine) {
    const result = { overall: 'SKIP', repo: path.basename(PROJECT_ROOT), phases: [], detail: 'machine.json not found — no Keystone constraints active' };
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
    if (mode !== 'ci') phases.push(runPhase1_5(machine, changedFiles));
  }
  if (mode !== 'ci') phases.push(runPhase2(machine, changedFiles));
  if (mode !== 'ci') phases.push(runPhase4(GATE_FILE));

  const failed = phases.filter(p => p.status === 'FAIL');
  const overall = failed.length > 0 ? 'FAIL' : 'PASS';

  if (mode === 'pre-commit') {
    for (const p of phases) {
      const color = p.status === 'FAIL' ? 'red' : p.status === 'SKIP' ? 'yellow' : 'green';
      console.log(`${c(`[${p.status}]`, color)} Phase ${p.phase}: ${p.name} — ${p.detail.split('\n')[0]}`);
    }
    if (overall === 'FAIL') {
      console.log(`\n${c('❌ Keystone validation FAILED', 'red')}`);
      for (const p of failed) console.log(`  ${p.detail}`);
      if (failed.some(f => f.fix)) console.log(`\nRun: ${c(failed.find(f => f.fix).fix, 'yellow')}`);
      process.exit(1);
    }
    console.log(`\n${c('✅ Keystone validation PASSED', 'green')}`);
    process.exit(0);
  }

  const result = { overall, repo: path.basename(PROJECT_ROOT), phases };
  if (failed.length > 0) result.failures = failed.map(f => ({ phase: f.phase, detail: f.detail, fix: f.fix }));
  console.log(JSON.stringify(result, null, 2));
  if (overall === 'FAIL' && mode === 'ci') process.exit(1);
}

main();
