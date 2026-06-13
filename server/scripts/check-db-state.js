import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== 检查数据库状态 ===\n');

    // 检查用户
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        is_active: true,
        real_name: true,
        email: true
      }
    });
    console.log('=== 用户列表 ===');
    console.log(JSON.stringify(users, null, 2));

    // 检查系统设置
    const settings = await prisma.system_settings.findMany();
    console.log('\n=== 系统设置 ===');
    console.log(JSON.stringify(settings, null, 2));

    // 统计数据
    const classCount = await prisma.classes.count();
    const majorCount = await prisma.majors.count();
    const collegeCount = await prisma.colleges.count();
    const courseCount = await prisma.courses.count();
    const planCount = await prisma.training_plans.count();

    console.log('\n=== 数据统计 ===');
    console.log(`班级数: ${classCount}`);
    console.log(`专业数: ${majorCount}`);
    console.log(`学院数: ${collegeCount}`);
    console.log(`课程数: ${courseCount}`);
    console.log(`培养方案数: ${planCount}`);

  } catch (error) {
    console.error('数据库检查失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
