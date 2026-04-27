#!/usr/bin/env node
/**
 * @Orchestrator Task Scheduler
 * 基于 machine.json 状态流转的任务调度器
 *
 * 功能：
 * 1. 读取当前任务状态
 * 2. 根据状态流转规则调度 Agent
 * 3. 自动流转任务状态
 * 4. 熔断重试策略
 *
 * @author Qoder Multi-Agent System
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MACHINE_FILE = path.join(PROJECT_ROOT, '..', '.opencode', 'state', 'machine.json');

// Agent 调度配置
const AGENT_SCHEDULE = {
  'Idle': ['@Meta-Planner'],
  'Ready': ['@Architect'],
  'InProgress': ['@Coder-BE', '@Coder-FE'],
  'Testing': ['@Coder-BE', '@Coder-FE'],
  'Review': ['@Guardian'],
  'Blocked': ['@Arbiter'],
  'Done': ['@CI-CD-Agent']
};

// 颜色定义
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  reset: '\x1b[0m'
};

function loadMachineJson() {
  if (!fs.existsSync(MACHINE_FILE)) {
    throw new Error(`Machine file not found: ${MACHINE_FILE}`);
  }
  return JSON.parse(fs.readFileSync(MACHINE_FILE, 'utf8'));
}

function saveMachineJson(data) {
  fs.writeFileSync(MACHINE_FILE, JSON.stringify(data, null, 2));
}

/**
 * 获取当前任务状态
 */
function getCurrentTask() {
  const machine = loadMachineJson();
  return machine.currentTask;
}

/**
 * 获取有效的状态流转选项
 */
function getValidTransitions(currentStatus) {
  const machine = loadMachineJson();
  return machine.stateTransitions.task[currentStatus] || [];
}

/**
 * 检查状态流转是否有效
 */
function isValidTransition(fromStatus, toStatus) {
  const validTransitions = getValidTransitions(fromStatus);
  return validTransitions.includes(toStatus);
}

/**
 * 流转任务状态
 */
function transitionTask(toStatus, options = {}) {
  const machine = loadMachineJson();
  const currentTask = machine.currentTask;
  const fromStatus = currentTask.status;

  // 验证流转是否有效
  if (!isValidTransition(fromStatus, toStatus)) {
    const validOptions = getValidTransitions(fromStatus);
    throw new Error(
      `Invalid transition: ${fromStatus} -> ${toStatus}\n` +
      `Valid options: ${validOptions.join(', ')}`
    );
  }

  const timestamp = new Date().toISOString();

  // 更新任务状态
  machine.currentTask = {
    ...currentTask,
    status: toStatus,
    lastTransition: {
      from: fromStatus,
      to: toStatus,
      timestamp,
      reason: options.reason || 'Manual transition'
    }
  };

  // 记录审计日志
  machine.auditLog.push({
    timestamp,
    agent: '@Orchestrator',
    action: 'TASK_TRANSITION',
    target: currentTask.id,
    details: `Status changed from ${fromStatus} to ${toStatus}: ${options.reason || 'No reason provided'}`
  });

  machine.meta.lastUpdated = timestamp;
  saveMachineJson(machine);

  console.log(`${colors.green}✅ Task transitioned:${colors.reset}`);
  console.log(`   ${fromStatus} -> ${toStatus}`);
  console.log(`   Task: ${currentTask.id} - ${currentTask.title}`);

  // 显示下一步建议
  showNextSteps(toStatus);

  return machine.currentTask;
}

/**
 * 显示下一步建议
 */
function showNextSteps(currentStatus) {
  const agents = AGENT_SCHEDULE[currentStatus] || [];
  const nextTransitions = getValidTransitions(currentStatus);

  console.log(`\n${colors.cyan}📋 Next Steps:${colors.reset}`);

  if (agents.length > 0) {
    console.log(`   Active Agents: ${agents.join(', ')}`);
  }

  if (nextTransitions.length > 0) {
    console.log(`   Valid Transitions:`);
    nextTransitions.forEach(status => {
      const nextAgents = AGENT_SCHEDULE[status] || [];
      console.log(`     - ${status}${nextAgents.length > 0 ? ` (by ${nextAgents.join('/')})` : ''}`);
    });
  } else {
    console.log(`   🎉 Task workflow complete!`);
  }
}

/**
 * 获取任务调度建议
 */
function getScheduleRecommendation() {
  const task = getCurrentTask();
  const agents = AGENT_SCHEDULE[task.status] || [];
  const transitions = getValidTransitions(task.status);

  console.log(`${colors.blue}📊 Task Schedule Recommendation${colors.reset}\n`);
  console.log(`Current Task: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${colors.yellow}${task.status}${colors.reset}`);
  console.log(`Owner: ${task.owner}`);
  console.log();

  if (agents.length > 0) {
    console.log(`${colors.green}🤖 Active Agents:${colors.reset}`);
    agents.forEach(agent => {
      console.log(`   - ${agent}`);
    });
    console.log();
  }

  if (transitions.length > 0) {
    console.log(`${colors.cyan}🔄 Available Transitions:${colors.reset}`);
    transitions.forEach(status => {
      const nextAgents = AGENT_SCHEDULE[status] || [];
      console.log(`   → ${status}`);
      if (nextAgents.length > 0) {
        console.log(`     Next: ${nextAgents.join(', ')}`);
      }
    });
  }

  return { task, agents, transitions };
}

/**
 * 熔断检查 - 检查任务是否卡住
 */
function checkCircuitBreaker() {
  const machine = loadMachineJson();
  const task = machine.currentTask;

  // 获取最近的审计日志
  const recentLogs = machine.auditLog
    .filter(log => log.target === task.id)
    .slice(-10);

  const transitionCount = recentLogs.filter(log =>
    log.action === 'TASK_TRANSITION' || log.action === 'TASK_STATUS_CHANGE'
  ).length;

  // 如果最近10条日志中有超过5次状态变更，可能处于震荡状态
  if (transitionCount > 5) {
    console.log(`${colors.red}⚠️  Circuit Breaker Warning!${colors.reset}`);
    console.log(`   Task ${task.id} has ${transitionCount} recent transitions.`);
    console.log(`   Consider involving @Arbiter for review.`);

    return {
      shouldBreak: true,
      reason: 'Too many state transitions',
      recommendation: 'Escalate to @Arbiter'
    };
  }

  return { shouldBreak: false };
}

/**
 * 自动调度 - 根据当前状态自动选择下一步
 */
function autoSchedule() {
  const { task, transitions } = getScheduleRecommendation();

  // 熔断检查
  const breaker = checkCircuitBreaker();
  if (breaker.shouldBreak) {
    console.log(`\n${colors.red}🛑 Auto-scheduling paused due to circuit breaker${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}🤖 Auto-Schedule Recommendation:${colors.reset}`);

  // 简单的决策逻辑
  switch (task.status) {
    case 'Idle':
      console.log(`   Suggested: Transition to 'Ready' when @Meta-Planner completes planning`);
      break;
    case 'Ready':
      console.log(`   Suggested: Transition to 'InProgress' when @Architect completes design`);
      break;
    case 'InProgress':
      console.log(`   Suggested: Transition to 'Testing' when @Coder completes implementation`);
      break;
    case 'Testing':
      console.log(`   Suggested: Transition to 'Review' when all tests pass`);
      break;
    case 'Review':
      console.log(`   Suggested: Transition to 'Done' when @Guardian approves`);
      break;
    case 'Blocked':
      console.log(`   Suggested: Wait for @Arbiter resolution`);
      break;
    default:
      console.log(`   No specific recommendation for status: ${task.status}`);
  }
}

// ==================== CLI Commands ====================

function showHelp() {
  console.log(`
${colors.blue}@Orchestrator Task Scheduler${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node orchestrator-task-scheduler.js <command> [options]

${colors.yellow}Commands:${colors.reset}
  ${colors.green}status${colors.reset}                    显示当前任务状态
  ${colors.green}transition <status>${colors.reset}       流转任务到指定状态
  ${colors.green}schedule${colors.reset}                  显示调度建议
  ${colors.green}auto${colors.reset}                      自动调度建议
  ${colors.green}validate${colors.reset}                  验证状态机完整性
  ${colors.green}help${colors.reset}                      显示帮助

${colors.yellow}Examples:${colors.reset}
  node orchestrator-task-scheduler.js status
  node orchestrator-task-scheduler.js transition InProgress
  node orchestrator-task-scheduler.js schedule
  node orchestrator-task-scheduler.js auto
`);
}

function showStatus() {
  const task = getCurrentTask();
  const transitions = getValidTransitions(task.status);

  console.log(`${colors.blue}📋 Current Task Status${colors.reset}\n`);
  console.log(`ID:       ${task.id}`);
  console.log(`Title:    ${task.title}`);
  console.log(`Status:   ${colors.yellow}${task.status}${colors.reset}`);
  console.log(`Owner:    ${task.owner}`);

  if (task.lastTransition) {
    console.log(`\nLast Transition:`);
    console.log(`   ${task.lastTransition.from} -> ${task.lastTransition.to}`);
    console.log(`   At: ${task.lastTransition.timestamp}`);
    console.log(`   Reason: ${task.lastTransition.reason}`);
  }

  console.log(`\n${colors.cyan}Valid Transitions:${colors.reset}`);
  transitions.forEach(t => console.log(`   - ${t}`));
}

function validateStateMachine() {
  console.log(`${colors.blue}🔍 Validating State Machine...${colors.reset}\n`);

  const machine = loadMachineJson();
  let isValid = true;

  // 检查必需字段
  const requiredFields = ['meta', 'currentTask', 'contracts', 'stateTransitions', 'auditLog'];
  for (const field of requiredFields) {
    if (!machine[field]) {
      console.log(`${colors.red}❌ Missing required field: ${field}${colors.reset}`);
      isValid = false;
    }
  }

  // 检查状态流转完整性
  const states = Object.keys(machine.stateTransitions.task);
  for (const state of states) {
    const transitions = machine.stateTransitions.task[state];
    for (const target of transitions) {
      if (!states.includes(target) && target !== 'Done') {
        console.log(`${colors.yellow}⚠️  Transition to unknown state: ${state} -> ${target}${colors.reset}`);
      }
    }
  }

  // 检查契约完整性
  const contracts = Object.keys(machine.contracts);
  if (contracts.length === 0) {
    console.log(`${colors.yellow}⚠️  No contracts defined${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ ${contracts.length} contracts defined${colors.reset}`);
    contracts.forEach(c => {
      const contract = machine.contracts[c];
      if (!contract.hash || contract.hash.includes('e3b0c44298fc')) {
        console.log(`${colors.yellow}   ⚠️  ${c}: Empty hash${colors.reset}`);
      } else {
        console.log(`${colors.green}   ✅ ${c}: Hash valid${colors.reset}`);
      }
    });
  }

  if (isValid) {
    console.log(`\n${colors.green}✅ State machine is valid${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ State machine has issues${colors.reset}`);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param1 = args[1];

  try {
    switch (command) {
      case 'status':
        showStatus();
        break;
      case 'transition':
        if (!param1) {
          console.error(`${colors.red}❌ Missing target status${colors.reset}`);
          showHelp();
          process.exit(1);
        }
        transitionTask(param1, { reason: args.slice(2).join(' ') || 'Manual transition' });
        break;
      case 'schedule':
        getScheduleRecommendation();
        break;
      case 'auto':
        autoSchedule();
        break;
      case 'validate':
        validateStateMachine();
        break;
      case 'help':
      case '--help':
      case '-h':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
