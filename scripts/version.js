#!/usr/bin/env node

/**
 * 版本管理脚本
 * 
 * 用法:
 *   node scripts/version.js              # 查看当前版本
 *   node scripts/version.js patch        # 增加补丁版本 (1.0.1 -> 1.0.2)
 *   node scripts/version.js minor        # 增加次版本 (1.0.1 -> 1.1.0)
 *   node scripts/version.js major        # 增加主版本 (1.0.1 -> 2.0.0)
 *   node scripts/version.js 1.2.3        # 直接设置版本号
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// 需要更新版本的文件列表
const versionFiles = [
  'package.json',                    // 根目录
  'client/package.json',             // 前端
  'server/package.json'              // 后端
];

// 解析版本号
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`无效的版本号格式: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  };
}

// 格式化版本号
function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

// 读取JSON文件
function readJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// 写入JSON文件(保持格式化)
function writeJSON(filePath, data) {
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');
}

// 更新单个文件的版本号
function updateFileVersion(filePath, newVersion) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  const pkg = readJSON(fullPath);
  const oldVersion = pkg.version;
  
  if (oldVersion === newVersion) {
    console.log(`  - ${filePath}: 已是最新版本 (${newVersion})`);
    return false;
  }

  pkg.version = newVersion;
  writeJSON(fullPath, pkg);
  console.log(`  ✓ ${filePath}: ${oldVersion} → ${newVersion}`);
  return true;
}

// 获取当前版本(从根目录package.json)
function getCurrentVersion() {
  const pkg = readJSON(path.join(rootDir, 'package.json'));
  return pkg.version;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    // 显示当前版本
    const currentVersion = getCurrentVersion();
    console.log(`\n📦 当前版本: v${currentVersion}\n`);
    console.log('用法:');
    console.log('  node scripts/version.js              # 查看当前版本');
    console.log('  node scripts/version.js patch        # 增加补丁版本 (1.0.1 -> 1.0.2)');
    console.log('  node scripts/version.js minor        # 增加次版本 (1.0.1 -> 1.1.0)');
    console.log('  node scripts/version.js major        # 增加主版本 (1.0.1 -> 2.0.0)');
    console.log('  node scripts/version.js 1.2.3        # 直接设置版本号\n');
    return;
  }

  const currentVersion = getCurrentVersion();
  let newVersion;

  if (['patch', 'minor', 'major'].includes(command)) {
    // 自动递增版本
    const { major, minor, patch } = parseVersion(currentVersion);
    
    switch (command) {
      case 'patch':
        newVersion = formatVersion({ major, minor, patch: patch + 1 });
        break;
      case 'minor':
        newVersion = formatVersion({ major, minor: minor + 1, patch: 0 });
        break;
      case 'major':
        newVersion = formatVersion({ major: major + 1, minor: 0, patch: 0 });
        break;
    }
  } else {
    // 直接指定版本号
    try {
      parseVersion(command); // 验证格式
      newVersion = command;
    } catch (e) {
      console.error(`❌ 错误: ${e.message}`);
      process.exit(1);
    }
  }

  console.log(`\n🔄 更新版本: v${currentVersion} → v${newVersion}\n`);

  // 更新所有文件的版本号
  let updatedCount = 0;
  for (const file of versionFiles) {
    if (updateFileVersion(file, newVersion)) {
      updatedCount++;
    }
  }

  if (updatedCount === 0) {
    console.log('\n✅ 所有文件已是最新版本');
    return;
  }

  console.log(`\n✅ 成功更新 ${updatedCount} 个文件\n`);

  // 询问是否创建Git提交和标签
  try {
    // 检查是否在git仓库中
    execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: rootDir });
    
    console.log('💡 提示: 你可以执行以下命令来提交更改:');
    console.log(`   git add package.json client/package.json server/package.json`);
    console.log(`   git commit -m "chore: bump version to v${newVersion}"`);
    console.log(`   git tag v${newVersion}`);
    console.log(`   git push && git push --tags\n`);
  } catch (e) {
    // 不在git仓库中,忽略
  }
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
