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

    // 获取所有班级
    const allClasses = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        enrollmentYear: true,
        durationYears: true,
        status: true,
      },
    });

    console.log(`共找到 ${allClasses.length} 个班级\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const cls of allClasses) {
      // 计算当前年级
      const grade = semesterInfo.startYear - cls.enrollmentYear + 1;

      // 根据新逻辑计算应该的状态
      const expectedStatus = grade <= cls.durationYears ? 'active' : 'graduated';

      // 如果状态不一致，则更新
      if (cls.status !== expectedStatus) {
        await prisma.class.update({
          where: { id: cls.id },
          data: { status: expectedStatus },
        });

        console.log(`[更新] ${cls.name}`);
        console.log(`  入学年份: ${cls.enrollmentYear}, 学制: ${cls.durationYears}年`);
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
