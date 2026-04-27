#!/usr/bin/env node
/**
 * Qoder State Hash Manager
 * 自动计算并更新契约文件的SHA256哈希值
 *
 * 契约列表从 machine.json contracts 动态读取，file 字段为 git-root-relative 路径。
 *
 * Usage:
 *   node scripts/update-machine-hash.js update  - 更新所有哈希值
 *   node scripts/update-machine-hash.js verify  - 校验哈希匹配（CI门禁用）
 *   node scripts/update-machine-hash.js <key>   - 更新指定契约的哈希值
 *
 * @author Qoder Multi-Agent System
 * @version 2.0.0
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Git 仓库根目录（所有契约 file 路径相对于此）
const GIT_ROOT = path.resolve(__dirname, '..', '..');
const MACHINE_FILE = path.join(GIT_ROOT, '.opencode', 'state', 'machine.json');

/**
 * 计算字符串的SHA256哈希
 * @param {string} content - 文件内容
 * @returns {string} - sha256-<hex> 格式
 */
function calculateSHA256(content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return `sha256-${hash}`;
}

/**
 * 获取文件或目录的哈希值
 * @param {string} relativePath - 相对于 git 根目录的路径
 * @returns {string|null} - 哈希值或null（文件不存在）
 */
function getFileHash(relativePath) {
  const fullPath = path.join(GIT_ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    // 目录：合并所有.ts文件内容（按文件名排序确保一致性）
    const files = fs.readdirSync(fullPath)
      .filter(f => f.endsWith('.ts'))
      .sort();

    if (files.length === 0) {
      return calculateSHA256(''); // 空目录 = 空字符串哈希
    }

    const combined = files
      .map(f => fs.readFileSync(path.join(fullPath, f), 'utf8'))
      .join('\n---FILE_SEPARATOR---\n');
    return calculateSHA256(combined);
  } else {
    // 文件：直接读取内容
    const content = fs.readFileSync(fullPath, 'utf8');
    return calculateSHA256(content);
  }
}

/**
 * 加载 machine.json
 * @returns {object} - 解析后的JSON对象
 */
function loadMachineJson() {
  if (!fs.existsSync(MACHINE_FILE)) {
    console.error(`❌ Machine file not found: ${MACHINE_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MACHINE_FILE, 'utf8'));
}

/**
 * 保存 machine.json
 * @param {object} data - 要保存的数据
 */
function saveMachineJson(data) {
  fs.writeFileSync(MACHINE_FILE, JSON.stringify(data, null, 2));
}

/**
 * 从 machine.json contracts 动态获取契约键列表
 * @param {object} machine - machine.json 对象
 * @returns {string[]} - 契约键名数组
 */
function getContractKeys(machine) {
  return Object.keys(machine.contracts || {});
}

/**
 * 更新所有契约哈希值
 */
function updateAllHashes() {
  console.log('🔧 [Qoder Hash Manager] Updating all contract hashes...\n');

  const machine = loadMachineJson();
  const timestamp = new Date().toISOString();
  let updatedCount = 0;

  const keys = getContractKeys(machine);

  keys.forEach(key => {
    const contract = machine.contracts[key];
    const relativePath = contract.file;
    const hash = getFileHash(relativePath);

    if (hash === null) {
      console.log(`⚠️  ${key}: File not found (${relativePath})`);
      return;
    }

    const currentHash = contract.hash;

    if (hash !== currentHash) {
      machine.contracts[key] = {
        ...contract,
        hash: hash,
        lastValidated: timestamp
      };

      machine.auditLog.push({
        timestamp,
        agent: '@Orchestrator',
        action: 'HASH_UPDATE',
        target: key,
        details: `Hash updated from ${currentHash?.substring(0, 20)}... to ${hash.substring(0, 20)}...`
      });

      console.log(`✅ ${key}: ${hash.substring(0, 30)}...`);
      updatedCount++;
    } else {
      console.log(`⏭️  ${key}: No change (${hash.substring(0, 30)}...)`);
    }
  });

  machine.meta.lastUpdated = timestamp;
  saveMachineJson(machine);

  console.log(`\n📝 Updated ${updatedCount} hash(es)`);
  console.log(`💾 Saved to: ${MACHINE_FILE}`);
}

/**
 * 更新指定契约的哈希值
 * @param {string} key - 契约键名
 */
function updateSingleHash(key) {
  const machine = loadMachineJson();
  const keys = getContractKeys(machine);

  if (!keys.includes(key)) {
    console.error(`❌ Unknown contract key: ${key}`);
    console.log(`Available keys: ${keys.join(', ')}`);
    process.exit(1);
  }

  console.log(`🔧 [Qoder Hash Manager] Updating hash for ${key}...\n`);

  const contract = machine.contracts[key];
  const relativePath = contract.file;
  const timestamp = new Date().toISOString();
  const hash = getFileHash(relativePath);

  if (hash === null) {
    console.error(`❌ File not found: ${relativePath}`);
    process.exit(1);
  }

  machine.contracts[key] = {
    ...contract,
    hash: hash,
    lastValidated: timestamp
  };

  machine.auditLog.push({
    timestamp,
    agent: '@Orchestrator',
    action: 'HASH_UPDATE',
    target: key,
    details: `Hash updated to ${hash.substring(0, 20)}...`
  });

  machine.meta.lastUpdated = timestamp;
  saveMachineJson(machine);

  console.log(`✅ ${key}: ${hash}`);
  console.log(`💾 Saved to: ${MACHINE_FILE}`);
}

/**
 * 校验所有哈希值是否匹配（CI门禁用）
 * @returns {boolean} - 是否全部匹配
 */
function verifyHashes() {
  console.log('🔍 [Qoder Hash Manager] Verifying contract hashes...\n');

  const machine = loadMachineJson();
  let allMatch = true;
  let checkedCount = 0;

  const keys = getContractKeys(machine);

  keys.forEach(key => {
    const contract = machine.contracts[key];
    const actual = getFileHash(contract.file);
    const expected = contract.hash;

    if (actual === null) {
      console.log(`⚠️  ${key}: File not found (${contract.file})`);
      return;
    }

    checkedCount++;
    const match = actual === expected;

    if (match) {
      console.log(`✅ ${key}: MATCH`);
    } else {
      console.log(`❌ ${key}: MISMATCH`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual:   ${actual}`);
      allMatch = false;
    }
  });

  console.log(`\n📊 Checked: ${checkedCount} contract(s)`);

  if (allMatch) {
    console.log('🎉 All hashes match!');
    return true;
  } else {
    console.log('💥 Hash mismatch detected!');
    console.log('\n💡 Run "node scripts/update-machine-hash.js update" to fix.');
    return false;
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  const machine = fs.existsSync(MACHINE_FILE) ? loadMachineJson() : null;
  const keys = machine ? getContractKeys(machine) : [];

  console.log(`
Qoder State Hash Manager v2.0.0

契约列表从 machine.json contracts 动态读取。

Usage:
  node scripts/update-machine-hash.js [command] [options]

Commands:
  update              Update all contract hashes
  verify              Verify all hashes match (CI gate)
  <contract-key>      Update specific contract hash
  help                Show this help message

Available contract keys:
  ${keys.length > 0 ? keys.join('\n  ') : '(load machine.json to see keys)'}

Examples:
  node scripts/update-machine-hash.js update
  node scripts/update-machine-hash.js verify
  node scripts/update-machine-hash.js backend-api
`);
}

// CLI 入口
function main() {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'update':
      updateAllHashes();
      break;
    case 'verify': {
      const success = verifyHashes();
      process.exit(success ? 0 : 1);
    }
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default: {
      const machine = loadMachineJson();
      const keys = getContractKeys(machine);
      if (keys.includes(command)) {
        updateSingleHash(command);
      } else {
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
      }
    }
  }
}

main();
