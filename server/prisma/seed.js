import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 清空现有数据（按依赖关系顺序）
  console.log('清空现有数据...');
  await prisma.audit_logs.deleteMany();
  await prisma.users.deleteMany();
  await prisma.plan_textbooks.deleteMany();
  await prisma.plan_course_semesters.deleteMany();
  await prisma.plan_courses.deleteMany();
  await prisma.training_plans.deleteMany();
  await prisma.classes.deleteMany();
  await prisma.textbooks.deleteMany();
  await prisma.courses.deleteMany();
  await prisma.majors.deleteMany();
  await prisma.colleges.deleteMany();
  await prisma.training_levels.deleteMany();
  await prisma.system_settings.deleteMany();
  console.log('数据清空完成\n');

  // ==================== 创建超级管理员账号 ====================
  console.log('创建超级管理员账号...');
  const adminPassword = await bcrypt.hash('admin@123456', 10);
  await prisma.users.create({
    data: {
      username: 'admin',
      password: adminPassword,
      role: 'super_admin',
      real_name: '系统管理员',
      email: 'admin@example.com',
      is_active: true
    }
  });
  console.log('✅ 超级管理员账号已创建：');
  console.log('   用户名: admin');
  console.log('   密码: admin@123456');
  console.log('   ⚠️ 请及时修改密码！\n');

  console.log('种子数据初始化完成！');
  console.log('提示：请登录系统后导入基础信息（培养层次、学院、专业等）');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
