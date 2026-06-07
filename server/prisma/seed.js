import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 系统设置
  await prisma.systemSetting.upsert({
    where: { key: 'current_semester' },
    update: {},
    create: { key: 'current_semester', value: '2025-2026-2', description: '当前学期' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'semester_start_date' },
    update: {},
    create: { key: 'semester_start_date', value: '2026-02-24', description: '当前学期开学日期' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'weeks_per_semester_default' },
    update: {},
    create: { key: 'weeks_per_semester_default', value: '18', description: '每学期默认周数' },
  });

  // 专业类别
  const majors = await Promise.all([
    prisma.major.create({ data: { name: '学前教育', code: 'EDU' } }),
    prisma.major.create({ data: { name: '计算机应用', code: 'CS' } }),
    prisma.major.create({ data: { name: '会计', code: 'ACC' } }),
  ]);

  // 课程
  const courses = await Promise.all([
    prisma.course.create({ data: { name: '语文', type: 'public' } }),
    prisma.course.create({ data: { name: '数学', type: 'public' } }),
    prisma.course.create({ data: { name: '英语', type: 'public' } }),
    prisma.course.create({ data: { name: '思想政治', type: 'public' } }),
    prisma.course.create({ data: { name: '体育', type: 'public' } }),
    prisma.course.create({ data: { name: '幼儿心理学', type: 'professional' } }),
    prisma.course.create({ data: { name: '幼儿教育学', type: 'professional' } }),
    prisma.course.create({ data: { name: '程序设计基础', type: 'professional' } }),
    prisma.course.create({ data: { name: '数据库应用', type: 'professional' } }),
    prisma.course.create({ data: { name: '基础会计', type: 'professional' } }),
    prisma.course.create({ data: { name: '财务管理', type: 'professional' } }),
  ]);

  // 教材
  const textbooks = await Promise.all([
    prisma.textbook.create({ data: { title: '大学语文', isbn: '978-7-04-001', publisher: '高等教育出版社', author: '张三', edition: '第3版' } }),
    prisma.textbook.create({ data: { title: '高等数学', isbn: '978-7-04-002', publisher: '高等教育出版社', author: '李四', edition: '第2版' } }),
    prisma.textbook.create({ data: { title: '大学英语', isbn: '978-7-04-003', publisher: '外语教学出版社', author: '王五' } }),
    prisma.textbook.create({ data: { title: '幼儿心理学教程', isbn: '978-7-04-004', publisher: '北京师范大学出版社', author: '赵六' } }),
    prisma.textbook.create({ data: { title: 'C语言程序设计', isbn: '978-7-04-005', publisher: '清华大学出版社', author: '孙七', edition: '第4版' } }),
    prisma.textbook.create({ data: { title: '基础会计学', isbn: '978-7-04-006', publisher: '中国人民大学出版社', author: '周八' } }),
  ]);

  // 培养方案
  const plans = await Promise.all([
    prisma.trainingPlan.create({ data: { name: '2024级学前教育培养方案', majorId: majors[0].id, version: 'v1.0' } }),
    prisma.trainingPlan.create({ data: { name: '2024级计算机应用培养方案', majorId: majors[1].id, version: 'v1.0' } }),
    prisma.trainingPlan.create({ data: { name: '2024级会计培养方案', majorId: majors[2].id, version: 'v1.0' } }),
  ]);

  // 辅助函数：创建课程 + 自动生成学期记录
  async function createPlanCourseWithSemesters(data) {
    const pc = await prisma.planCourse.create({ data });
    for (let s = data.startSemester; s <= data.endSemester; s++) {
      await prisma.planCourseSemester.create({
        data: {
          planCourseId: pc.id,
          semester: s,
          weeklyHours: data.weeklyHours,
          weeksCount: data.weeksPerSemester || 18,
        },
      });
    }
    return pc;
  }

  // 辅助函数：创建教材关联
  async function createTextbookLink(semesterId, textbookId, isRequired = true) {
    return prisma.planTextbook.create({
      data: { semesterId, textbookId, isRequired },
    });
  }

  // 学前教育方案课程
  const eduPlanCourses = [];
  for (const item of [
    { planId: plans[0].id, courseId: courses[0].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },     // 语文 1-4
    { planId: plans[0].id, courseId: courses[1].id, startSemester: 1, endSemester: 2, weeklyHours: 2 },     // 数学 1-2
    { planId: plans[0].id, courseId: courses[2].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },     // 英语 1-4
    { planId: plans[0].id, courseId: courses[3].id, startSemester: 1, endSemester: 4, weeklyHours: 2 },     // 思政 1-4
    { planId: plans[0].id, courseId: courses[4].id, startSemester: 1, endSemester: 6, weeklyHours: 2 },     // 体育 1-6
    { planId: plans[0].id, courseId: courses[5].id, startSemester: 3, endSemester: 6, weeklyHours: 4 },     // 幼儿心理学 3-6
    { planId: plans[0].id, courseId: courses[6].id, startSemester: 3, endSemester: 6, weeklyHours: 3 },     // 幼儿教育学 3-6
  ]) {
    eduPlanCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 计算机方案课程
  const csPlanCourses = [];
  for (const item of [
    { planId: plans[1].id, courseId: courses[0].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },     // 语文 1-2
    { planId: plans[1].id, courseId: courses[1].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },     // 数学 1-4
    { planId: plans[1].id, courseId: courses[2].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },     // 英语 1-2
    { planId: plans[1].id, courseId: courses[4].id, startSemester: 1, endSemester: 4, weeklyHours: 2 },     // 体育 1-4
    { planId: plans[1].id, courseId: courses[7].id, startSemester: 1, endSemester: 4, weeklyHours: 6 },     // 程序设计 1-4
    { planId: plans[1].id, courseId: courses[8].id, startSemester: 3, endSemester: 4, weeklyHours: 4 },     // 数据库 3-4
  ]) {
    csPlanCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 会计方案课程
  const accPlanCourses = [];
  for (const item of [
    { planId: plans[2].id, courseId: courses[0].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },     // 语文 1-2
    { planId: plans[2].id, courseId: courses[1].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },     // 数学 1-4
    { planId: plans[2].id, courseId: courses[4].id, startSemester: 1, endSemester: 4, weeklyHours: 2 },     // 体育 1-4
    { planId: plans[2].id, courseId: courses[9].id, startSemester: 1, endSemester: 4, weeklyHours: 6 },     // 基础会计 1-4
    { planId: plans[2].id, courseId: courses[10].id, startSemester: 3, endSemester: 4, weeklyHours: 4 },    // 财务管理 3-4
  ]) {
    accPlanCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 教材关联
  const allSemesters = await prisma.planCourseSemester.findMany();

  // 语文第1学期 → 大学语文
  const cnSem1 = allSemesters.find(s => s.planCourseId === eduPlanCourses[0].id && s.semester === 1);
  if (cnSem1) await createTextbookLink(cnSem1.id, textbooks[0].id);

  // 英语第1学期 → 大学英语
  const enSem1 = allSemesters.find(s => s.planCourseId === eduPlanCourses[2].id && s.semester === 1);
  if (enSem1) await createTextbookLink(enSem1.id, textbooks[2].id);

  // 幼儿心理学第3学期 → 幼儿心理学教程
  const psySem3 = allSemesters.find(s => s.planCourseId === eduPlanCourses[5].id && s.semester === 3);
  if (psySem3) await createTextbookLink(psySem3.id, textbooks[3].id);

  // 数学第1学期 → 高等数学
  const mathSem1 = allSemesters.find(s => s.planCourseId === csPlanCourses[1].id && s.semester === 1);
  if (mathSem1) await createTextbookLink(mathSem1.id, textbooks[1].id);

  // 程序设计第1学期 → C语言程序设计
  const progSem1 = allSemesters.find(s => s.planCourseId === csPlanCourses[4].id && s.semester === 1);
  if (progSem1) await createTextbookLink(progSem1.id, textbooks[4].id);

  // 基础会计第1学期 → 基础会计学
  const accSem1 = allSemesters.find(s => s.planCourseId === accPlanCourses[3].id && s.semester === 1);
  if (accSem1) await createTextbookLink(accSem1.id, textbooks[5].id);

  // 班级
  await Promise.all([
    prisma.class.create({ data: { name: '2024级学前1班', enrollmentYear: 2024, durationYears: 3, majorId: majors[0].id, studentCount: 45 } }),
    prisma.class.create({ data: { name: '2024级学前2班', enrollmentYear: 2024, durationYears: 3, majorId: majors[0].id, studentCount: 42 } }),
    prisma.class.create({ data: { name: '2024级计算机1班', enrollmentYear: 2024, durationYears: 3, majorId: majors[1].id, studentCount: 50 } }),
    prisma.class.create({ data: { name: '2024级会计1班', enrollmentYear: 2024, durationYears: 3, majorId: majors[2].id, studentCount: 38 } }),
    prisma.class.create({ data: { name: '2025级学前1班', enrollmentYear: 2025, durationYears: 3, majorId: majors[0].id, studentCount: 48 } }),
    prisma.class.create({ data: { name: '2025级计算机1班', enrollmentYear: 2025, durationYears: 3, majorId: majors[1].id, studentCount: 52 } }),
  ]);

  console.log('Seed data created successfully');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
