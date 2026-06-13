/**
 * 生产环境诊断脚本
 * 用法: node scripts/diagnose.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env 文件不存在，使用默认配置');
}

console.log('🔍 KEC Manager 生产环境诊断工具\n');

async function diagnose() {
  const results = [];

  // 1. 检查环境变量
  console.log('1️⃣ 检查环境变量...');
  const requiredEnvVars = ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    console.error(`   ❌ 缺少必要的环境变量: ${missingEnvVars.join(', ')}`);
    results.push({ check: '环境变量', status: 'FAIL', details: `缺少: ${missingEnvVars.join(', ')}` });
  } else {
    console.log('   ✅ 所有必要的环境变量已配置');
    console.log(`      - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`      - DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 20)}...`);
    console.log(`      - JWT_SECRET: ${process.env.JWT_SECRET?.length >= 32 ? '✓ 长度合格' : '✗ 长度不足'}`);
    results.push({ check: '环境变量', status: 'PASS' });
  }

  // 2. 检查数据库路径（SQLite）
  console.log('\n2️⃣ 检查数据库配置...');
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    const dbPath = process.env.DATABASE_URL.replace('file:', '');
    const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(__dirname, '..', dbPath);

    console.log(`   数据库类型: SQLite`);
    console.log(`   数据库路径: ${absolutePath}`);

    const dbDir = path.dirname(absolutePath);
    if (!fs.existsSync(dbDir)) {
      console.error(`   ❌ 数据库目录不存在: ${dbDir}`);
      results.push({ check: '数据库目录', status: 'FAIL', details: `目录不存在: ${dbDir}` });
    } else {
      console.log(`   ✅ 数据库目录存在`);
      results.push({ check: '数据库目录', status: 'PASS' });

      // 检查目录权限
      try {
        fs.accessSync(dbDir, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`   ✅ 数据库目录有读写权限`);
        results.push({ check: '数据库权限', status: 'PASS' });
      } catch (e) {
        console.error(`   ❌ 数据库目录没有读写权限: ${e.message}`);
        results.push({ check: '数据库权限', status: 'FAIL', details: e.message });
      }
    }

    if (fs.existsSync(absolutePath)) {
      console.log(`   ✅ 数据库文件存在`);
      const stats = fs.statSync(absolutePath);
      console.log(`      文件大小: ${(stats.size / 1024).toFixed(2)} KB`);

      // 检查文件权限
      try {
        fs.accessSync(absolutePath, fs.constants.R_OK | fs.constants.W_OK);
        console.log(`   ✅ 数据库文件有读写权限`);
        results.push({ check: '数据库文件', status: 'PASS' });
      } catch (e) {
        console.error(`   ❌ 数据库文件没有读写权限: ${e.message}`);
        results.push({ check: '数据库文件', status: 'FAIL', details: e.message });
      }
    } else {
      console.warn(`   ⚠️  数据库文件不存在（将在首次运行时创建）`);
      results.push({ check: '数据库文件', status: 'WARN', details: '文件不存在' });
    }
  } else if (process.env.DATABASE_URL?.startsWith('mysql:')) {
    console.log(`   数据库类型: MySQL`);
    console.log(`   连接字符串: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
    results.push({ check: '数据库类型', status: 'INFO', details: 'MySQL（需要手动验证连接）' });
  } else {
    console.error(`   ❌ 未知的数据库类型或配置错误`);
    results.push({ check: '数据库配置', status: 'FAIL', details: 'DATABASE_URL 格式错误' });
  }

  // 3. 测试数据库连接
  console.log('\n3️⃣ 测试数据库连接...');
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('   ✅ 数据库连接成功');
    results.push({ check: '数据库连接', status: 'PASS' });

    // 测试查询 system_settings 表
    console.log('\n4️⃣ 测试 system_settings 表查询...');
    try {
      const settings = await prisma.system_settings.findMany();
      console.log(`   ✅ 查询成功，找到 ${settings.length} 条设置记录`);

      const hasOrgName = settings.some(s => s.key === 'organization_name');
      const hasCurrentSemester = settings.some(s => s.key === 'current_semester');

      if (hasOrgName) {
        const orgSetting = settings.find(s => s.key === 'organization_name');
        console.log(`      - organization_name: ${orgSetting.value}`);
      } else {
        console.warn(`      ⚠️  缺少 organization_name 设置`);
      }

      if (hasCurrentSemester) {
        const semSetting = settings.find(s => s.key === 'current_semester');
        console.log(`      - current_semester: ${semSetting.value}`);
      } else {
        console.warn(`      ⚠️  缺少 current_semester 设置`);
      }

      results.push({ check: 'system_settings 表', status: 'PASS', details: `${settings.length} 条记录` });
    } catch (e) {
      console.error(`   ❌ 查询 system_settings 表失败: ${e.message}`);
      console.error(`      错误代码: ${e.code}`);
      console.error(`      堆栈跟踪:\n${e.stack}`);
      results.push({ check: 'system_settings 表', status: 'FAIL', details: e.message });
    }

    // 检查是否需要初始化默认设置
    if (results[results.length - 1].status === 'PASS') {
      const settings = await prisma.system_settings.findMany();
      const hasOrgName = settings.some(s => s.key === 'organization_name');
      const hasCurrentSemester = settings.some(s => s.key === 'current_semester');

      if (!hasOrgName || !hasCurrentSemester) {
        console.log('\n5️⃣ 初始化默认设置...');
        try {
          await prisma.system_settings.upsert({
            where: { key: 'organization_name' },
            update: {},
            create: {
              key: 'organization_name',
              value: '欢迎回来',
              description: '系统标识（单位名称），用于首页展示'
            }
          });

          await prisma.system_settings.upsert({
            where: { key: 'current_semester' },
            update: {},
            create: {
              key: 'current_semester',
              value: '2025-2026-2',
              description: '当前学期（格式：起始学年-结束学年-学期序号）'
            }
          });

          console.log('   ✅ 默认设置已初始化');
          results.push({ check: '默认设置初始化', status: 'PASS' });
        } catch (e) {
          console.error(`   ❌ 初始化默认设置失败: ${e.message}`);
          results.push({ check: '默认设置初始化', status: 'FAIL', details: e.message });
        }
      }
    }
  } catch (e) {
    console.error(`   ❌ 数据库连接失败: ${e.message}`);
    console.error(`      错误代码: ${e.code}`);
    console.error(`      客户端版本: ${require('@prisma/client/package.json').version}`);
    console.error(`\n   可能的原因:`);
    console.error(`   1. 数据库文件不存在或路径错误`);
    console.error(`   2. 数据库文件权限不足`);
    console.error(`   3. Prisma schema 未同步`);
    console.error(`   4. 数据库被锁定（SQLite）`);
    console.error(`\n   建议的解决方案:`);
    console.error(`   1. 确保数据库目录存在且有读写权限`);
    console.error(`   2. 运行: npx prisma generate`);
    console.error(`   3. 运行: npx prisma migrate deploy`);
    console.error(`   4. 检查文件权限: chown www-data:www-data data/kec.db`);
    results.push({ check: '数据库连接', status: 'FAIL', details: e.message });
  } finally {
    await prisma.$disconnect();
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 诊断结果汇总:\n');

  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const passCount = results.filter(r => r.status === 'PASS').length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${index + 1}. ${icon} ${result.check}: ${result.status}`);
    if (result.details) {
      console.log(`      ${result.details}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`总计: ${passCount} 通过, ${warnCount} 警告, ${failCount} 失败\n`);

  if (failCount > 0) {
    console.log('⚠️  发现严重问题，请根据上述建议进行修复！\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  发现一些警告，建议处理但不影响基本功能。\n');
    process.exit(0);
  } else {
    console.log('✅ 所有检查通过，系统状态正常！\n');
    process.exit(0);
  }
}

diagnose().catch(err => {
  console.error('💥 诊断过程发生未预期错误:', err);
  process.exit(1);
});
