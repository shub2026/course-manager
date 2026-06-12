/**
 * 批量更新班级状态脚本
 * 根据新的计算逻辑更新所有班级的状态
 */

import { prisma } from '../src/lib/prisma.js';
import { getCurrentSemesterInfo } from '../src/services/settings.service.js';

async function updateClassStatus() {
  try {
    console.log('=== 开始更新班级状态 ===\n');

    // 获取当前学期信息
    const semesterInfo = await getCurrentSemesterInfo();
    console.log('当前学期配置:', semesterInfo.label);
    console.log('起始学年:', semesterInfo.startYear);
    console.log();

    // 获取所有班级（修复：使用正确的模型名classes和字段名snake_case）
    const allClasses = await prisma.classes.findMany({
      select: {
        id: true,
        name: true,
        enrollment_year: true,
        duration_years: true,
        status: true,
      },
    });

    console.log(`共找到 ${allClasses.length} 个班级\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const cls of allClasses) {
      // 计算当前年级（修复：使用snake_case字段名）
      const grade = semesterInfo.startYear - cls.enrollment_year + 1;

      // 根据新逻辑计算应该的状态（修复：使用snake_case字段名）
      const expectedStatus = grade <= cls.duration_years ? 'active' : 'graduated';

      // 如果状态不一致，则更新（修复：使用正确的模型名classes）
      if (cls.status !== expectedStatus) {
        await prisma.classes.update({
          where: { id: cls.id },
          data: { status: expectedStatus },
        });

        console.log(`[更新] ${cls.name}`);
        console.log(`  入学年份: ${cls.enrollment_year}, 学制: ${cls.duration_years}年`);
        console.log(`  当前年级: ${grade}, 原状态: ${cls.status}, 新状态: ${expectedStatus}\n`);

        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('\n=== 更新完成 ===');
    console.log(`更新的班级数: ${updatedCount}`);
    console.log(`无需更新的班级数: ${unchangedCount}`);
    console.log(`总班级数: ${allClasses.length}`);

  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateClassStatus();
