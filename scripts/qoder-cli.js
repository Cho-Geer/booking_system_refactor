#!/usr/bin/env node
/**
 * Qoder CLI - 状态机管理工具
 * 提供 qoder state 系列命令
 *
 * Usage:
 *   qoder state update-contract-hash [key]  - 更新契约哈希
 *   qoder state verify                      - 校验契约哈希
 *   qoder state task set <id> <status>      - 设置任务状态
 *   qoder state task get                    - 获取当前任务
 *   qoder state task transition <to>        - 流转任务状态
 *   qoder state audit-log                   - 查看审计日志
 *
 * @author Qoder Multi-Agent System
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MACHINE_FILE = path.join(PROJECT_ROOT, '..', '.opencode', 'state', 'machine.json');

// 契约文件配置
const CONTRACTS = {
  'backend-api': {
    path: 'booking_system_refactor/contract.yaml',
    owner: '@Architect'
  },
  'prisma-schema': {
    path: 'booking_system_refactor/booking-backend/prisma/schema.prisma',
    owner: '@Coder-BE'
  },
  'frontend-dto': {
    path: 'booking_system_refactor/booking-frontend/src/app/shared/dto/',
    owner: '@Coder-FE',
    isDirectory: true
  },
  'frontend-environment': {
    path: 'booking_system_refactor/booking-frontend/src/environments/environment.ts',
    owner: '@Coder-FE'
  }
};

// 颜色定义
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  reset: '\x1b[0m'
};

function calculateSHA256(content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `sha256-${hash}`;
}

function getFileHash(relativePath, isDirectory = false) {
  const fullPath = path.join(PROJECT_ROOT, '..', relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.ts'))
      .sort();

    if (files.length === 0) {
      return calculateSHA256('');
    }

    const combined = files
      .map(f => fs.readFileSync(path.join(fullPath, f), 'utf8'))
      .join('\n---FILE_SEPARATOR---\n');
    return calculateSHA256(combined);
  } else {
    const content = fs.readFileSync(fullPath, 'utf8');
    return calculateSHA256(content);
  }
}

function loadMachineJson() {
  if (!fs.existsSync(MACHINE_FILE)) {
    console.error(`${colors.red}❌ Machine file not found: ${MACHINE_FILE}${colors.reset}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MACHINE_FILE, 'utf8'));
}

function saveMachineJson(data) {
  fs.writeFileSync(MACHINE_FILE, JSON.stringify(data, null, 2));
}

// ==================== State Commands ====================

function updateContractHash(key = null) {
  console.log(`${colors.blue}🔧 [Qoder] Updating contract hash(es)...${colors.reset}\n`);

  const machine = loadMachineJson();
  const timestamp = new Date().toISOString();
  let updatedCount = 0;

  const keysToUpdate = key ? [key] : Object.keys(CONTRACTS);

  for (const k of keysToUpdate) {
    if (!CONTRACTS[k]) {
      console.error(`${colors.red}❌ Unknown contract: ${k}${colors.reset}`);
      console.log(`Available: ${Object.keys(CONTRACTS).join(', ')}`);
      continue;
    }

    const config = CONTRACTS[k];
    const hash = getFileHash(config.path, config.isDirectory);

    if (hash === null) {
      console.log(`${colors.yellow}⚠️  ${k}: File not found (${config.path})${colors.reset}`);
      continue;
    }

    const currentHash = machine.contracts[k]?.hash;

    if (hash !== currentHash) {
      machine.contracts[k] = {
        ...machine.contracts[k],
        file: config.path,
        hash: hash,
        lastValidated: timestamp,
        owner: config.owner
      };

      machine.auditLog.push({
        timestamp,
        agent: '@Orchestrator',
        action: 'HASH_UPDATE',
        target: k,
        details: `Hash updated from ${currentHash?.substring(0, 20)}... to ${hash.substring(0, 20)}...`
      });

      console.log(`${colors.green}✅ ${k}: ${hash.substring(0, 40)}...${colors.reset}`);
      updatedCount++;
    } else {
      console.log(`${colors.blue}⏭️  ${k}: No change${colors.reset}`);
    }
  }

  machine.meta.lastUpdated = timestamp;
  saveMachineJson(machine);

  console.log(`\n${colors.green}📝 Updated ${updatedCount} hash(es)${colors.reset}`);
  console.log(`${colors.blue}💾 Saved to: ${MACHINE_FILE}${colors.reset}`);
}

function verifyContracts() {
  console.log(`${colors.blue}🔍 [Qoder] Verifying contract hashes...${colors.reset}\n`);

  const machine = loadMachineJson();
  let allMatch = true;
  let checkedCount = 0;

  for (const [key, config] of Object.entries(CONTRACTS)) {
    const actual = getFileHash(config.path, config.isDirectory);
    const expected = machine.contracts[key]?.hash;

    if (actual === null) {
      console.log(`${colors.yellow}⚠️  ${key}: File not found (${config.path})${colors.reset}`);
      continue;
    }

    checkedCount++;
    const match = actual === expected;

    if (match) {
      console.log(`${colors.green}✅ ${key}: MATCH${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${key}: MISMATCH${colors.reset}`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual:   ${actual}`);
      allMatch = false;
    }
  }

  console.log(`\n${colors.blue}📊 Checked: ${checkedCount} contract(s)${colors.reset}`);

  if (allMatch) {
    console.log(`${colors.green}🎉 All hashes match!${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}💥 Hash mismatch detected!${colors.reset}`);
    console.log(`\n💡 Run "qoder state update-contract-hash" to fix.`);
    return false;
  }
}

// ==================== Task Commands ====================

function getCurrentTask() {
  const machine = loadMachineJson();
  const task = machine.currentTask;

  console.log(`${colors.blue}📋 Current Task:${colors.reset}`);
  console.log(`   ID:     ${task.id}`);
  console.log(`   Title:  ${task.title}`);
  console.log(`   Status: ${colors.yellow}${task.status}${colors.reset}`);
  console.log(`   Owner:  ${task.owner}`);
}

function setTask(id, status) {
  const machine = loadMachineJson();
  const timestamp = new Date().toISOString();

  const oldStatus = machine.currentTask.status;

  machine.currentTask = {
    id,
    title: machine.currentTask.title,
    status,
    owner: machine.currentTask.owner
  };

  machine.auditLog.push({
    timestamp,
    agent: '@Orchestrator',
    action: 'TASK_STATUS_CHANGE',
    target: id,
    details: `Status changed from ${oldStatus} to ${status}`
  });

  machine.meta.lastUpdated = timestamp;
  saveMachineJson(machine);

  console.log(`${colors.green}✅ Task updated:${colors.reset}`);
  console.log(`   ID:     ${id}`);
  console.log(`   Status: ${colors.yellow}${status}${colors.reset}`);
}

function transitionTask(toStatus) {
  const machine = loadMachineJson();
  const currentStatus = machine.currentTask.status;
  const validTransitions = machine.stateTransitions.task[currentStatus] || [];

  if (!validTransitions.includes(toStatus)) {
    console.error(`${colors.red}❌ Invalid transition: ${currentStatus} -> ${toStatus}${colors.reset}`);
    console.log(`${colors.yellow}Valid transitions from ${currentStatus}:${colors.reset}`);
    validTransitions.forEach(s => console.log(`   - ${s}`));
    process.exit(1);
  }

  setTask(machine.currentTask.id, toStatus);
  console.log(`${colors.green}✅ Task transitioned: ${currentStatus} -> ${toStatus}${colors.reset}`);
}

// ==================== Audit Log Commands ====================

function showAuditLog(limit = 10) {
  const machine = loadMachineJson();
  const logs = machine.auditLog.slice(-limit).reverse();

  console.log(`${colors.blue}📜 Recent Audit Log (last ${limit} entries):${colors.reset}\n`);

  logs.forEach((log, index) => {
    const color = log.action.includes('ERROR') || log.action.includes('FAIL') ? colors.red :
                  log.action.includes('SUCCESS') || log.action.includes('COMPLETE') ? colors.green :
                  colors.yellow;

    console.log(`${index + 1}. [${log.timestamp}] ${color}${log.action}${colors.reset}`);
    console.log(`   Agent: ${log.agent} | Target: ${log.target}`);
    console.log(`   ${log.details}`);
    console.log();
  });
}

// ==================== CLI Entry ====================

function showHelp() {
  console.log(`
${colors.blue}Qoder State CLI${colors.reset} - 状态机管理工具

${colors.yellow}Usage:${colors.reset}
  qoder <command> [options]

${colors.yellow}Commands:${colors.reset}
  ${colors.green}state update-contract-hash [key]${colors.reset}  更新契约哈希（不指定key则更新所有）
  ${colors.green}state verify${colors.reset}                      校验所有契约哈希
  ${colors.green}state task get${colors.reset}                    获取当前任务
  ${colors.green}state task set <id> <status>${colors.reset}      设置任务状态
  ${colors.green}state task transition <status>${colors.reset}    流转任务状态
  ${colors.green}state audit-log [limit]${colors.reset}           查看审计日志（默认10条）

${colors.yellow}Examples:${colors.reset}
  qoder state update-contract-hash
  qoder state update-contract-hash frontend-dto
  qoder state verify
  qoder state task get
  qoder state task transition InProgress
  qoder state audit-log 20
`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subCommand = args[1];
  const subSubCommand = args[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (command === 'state') {
    switch (subCommand) {
      case 'update-contract-hash':
        updateContractHash(subSubCommand);
        break;
      case 'verify':
        const success = verifyContracts();
        process.exit(success ? 0 : 1);
      case 'task':
        if (subSubCommand === 'get') {
          getCurrentTask();
        } else if (subSubCommand === 'set' && args[3] && args[4]) {
          setTask(args[3], args[4]);
        } else if (subSubCommand === 'transition' && args[3]) {
          transitionTask(args[3]);
        } else {
          console.error(`${colors.red}❌ Invalid task command${colors.reset}`);
          showHelp();
          process.exit(1);
        }
        break;
      case 'audit-log':
        showAuditLog(parseInt(args[2]) || 10);
        break;
      default:
        console.error(`${colors.red}❌ Unknown state command: ${subCommand}${colors.reset}`);
        showHelp();
        process.exit(1);
    }
  } else {
    console.error(`${colors.red}❌ Unknown command: ${command}${colors.reset}`);
    showHelp();
    process.exit(1);
  }
}

main();
