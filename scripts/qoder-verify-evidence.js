#!/usr/bin/env node
/**
 * Qoder Evidence Validator
 * 验证任务生命周期转换所需的证据文件
 *
 * 用法:
 *   node scripts/qoder-verify-evidence.js
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const MACHINE_FILE = path.join(__dirname, '..', '.opencode', 'state', 'machine.json');
const TASK_DAG_FILE = path.join(__dirname, '..', 'Task.DAG.json');
const TASKS_DIR = path.join(__dirname, '..', 'tasks');

// 颜色输出
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function validateEvidenceFile(filePath, schema, taskId) {
  const fullPath = path.join(__dirname, '..', filePath.replace('{taskId}', taskId));

  if (!fs.existsSync(fullPath)) {
    return { valid: false, error: `文件不存在: ${fullPath}` };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // 检查 contentMustContain
  if (schema.contentMustContain) {
    const pattern = new RegExp(schema.contentMustContain);
    if (!pattern.test(content)) {
      return { valid: false, error: `必须包含模式: ${schema.contentMustContain}` };
    }
  }

  // 检查 contentMustNotContain
  if (schema.contentMustNotContain) {
    const pattern = new RegExp(schema.contentMustNotContain);
    if (pattern.test(content)) {
      return { valid: false, error: `不得包含模式: ${schema.contentMustNotContain}` };
    }
  }

  // JSON Schema 校验
  if (schema.schema && fullPath.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(schema.schema);
      const valid = validate(data);

      if (!valid) {
        return {
          valid: false,
          error: `Schema 校验失败: ${JSON.stringify(validate.errors, null, 2)}`
        };
      }
    } catch (error) {
      return { valid: false, error: `JSON 解析失败: ${error.message}` };
    }
  }

  return { valid: true };
}

function main() {
  log('🔍 [Qoder] 验证任务生命周期证据文件...', 'blue');

  // 加载 machine.json
  const machine = loadJSON(MACHINE_FILE);
  if (!machine) {
    log('⚠️ [Qoder] machine.json 未找到，跳过验证', 'yellow');
    process.exit(0);
  }

  // 加载 Task.DAG.json
  const taskDAG = loadJSON(TASK_DAG_FILE);
  if (!taskDAG || !taskDAG.tasks) {
    log('⚠️ [Qoder] Task.DAG.json 未找到或格式错误，跳过验证', 'yellow');
    process.exit(0);
  }

  const transitions = machine.taskLifecycle?.transitions || [];
  let hasError = false;

  // 遍历所有任务
  for (const task of taskDAG.tasks) {
    const taskId = task.id;
    const currentStatus = task.status;

    // 查找该任务的所有可能转换
    const taskTransitions = transitions.filter(t => t.from === currentStatus);

    for (const transition of taskTransitions) {
      const toStatus = transition.to;
      const requiredEvidence = transition.requiredEvidence || [];

      for (const evidence of requiredEvidence) {
        const filePattern = evidence.filePattern.replace('{taskId}', taskId);

        log(`  检查任务 ${taskId}: ${currentStatus} → ${toStatus}`, 'blue');
        log(`    证据文件: ${filePattern}`, 'reset');

        const result = validateEvidenceFile(filePattern, evidence, taskId);

        if (!result.valid) {
          log(`    ❌ ${result.error}`, 'red');
          hasError = true;
        } else {
          log(`    ✅ 通过`, 'green');
        }
      }
    }
  }

  if (hasError) {
    log('', 'reset');
    log('❌ [Qoder] 证据文件验证失败', 'red');
    process.exit(1);
  }

  log('', 'reset');
  log('✅ [Qoder] 所有证据文件验证通过', 'green');
  process.exit(0);
}

main();
