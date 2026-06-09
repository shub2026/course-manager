import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 清空现有数据（按依赖关系顺序）
  console.log('清空现有数据...');
  await prisma.planTextbook.deleteMany();
  await prisma.planCourseSemester.deleteMany();
  await prisma.planCourse.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.class.deleteMany();
  await prisma.textbook.deleteMany();
  await prisma.course.deleteMany();
  await prisma.major.deleteMany();
  await prisma.college.deleteMany();
  await prisma.trainingLevel.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log('数据清空完成');

  // ==================== 1. 系统设置 ====================
  console.log('创建系统设置...');
  await prisma.systemSetting.create({
    data: { key: 'current_semester', value: '2025-2026-2', description: '当前学期' },
  });

  // ==================== 2. 基础信息 - 培养层次（5个）====================
  console.log('创建培养层次...');
  const levels = await Promise.all([
    prisma.trainingLevel.create({ data: { name: '中专', code: 'ZZ', sortOrder: 1 } }),
    prisma.trainingLevel.create({ data: { name: '3+2大专', code: '32DZ', sortOrder: 2 } }),
    prisma.trainingLevel.create({ data: { name: '高技工', code: 'GJG', sortOrder: 3 } }),
    prisma.trainingLevel.create({ data: { name: '5年制大专', code: '5NDZ', sortOrder: 4 } }),
    prisma.trainingLevel.create({ data: { name: '高职', code: 'GZ', sortOrder: 5 } }),
  ]);
  console.log(`  已创建 ${levels.length} 个培养层次`);

  // ==================== 3. 基础信息 - 学院（5个）====================
  console.log('创建学院...');
  const colleges = await Promise.all([
    prisma.college.create({ data: { name: '信息技术学院', code: 'XXJS', sortOrder: 1 } }),
    prisma.college.create({ data: { name: '教育学院', code: 'JY', sortOrder: 2 } }),
    prisma.college.create({ data: { name: '商学院', code: 'SY', sortOrder: 3 } }),
    prisma.college.create({ data: { name: '工程学院', code: 'GC', sortOrder: 4 } }),
    prisma.college.create({ data: { name: '艺术学院', code: 'YS', sortOrder: 5 } }),
  ]);
  console.log(`  已创建 ${colleges.length} 个学院`);

  // ==================== 4. 基础信息 - 专业（5个）====================
  console.log('创建专业...');
  const majors = await Promise.all([
    prisma.major.create({ data: { name: '计算机应用技术', code: 'CS', description: '计算机应用与维护' } }),
    prisma.major.create({ data: { name: '学前教育', code: 'EDU', description: '幼儿教育与培训' } }),
    prisma.major.create({ data: { name: '电子商务', code: 'EC', description: '电商运营与管理' } }),
    prisma.major.create({ data: { name: '会计电算化', code: 'ACC', description: '财务会计与信息化' } }),
    prisma.major.create({ data: { name: '数字媒体艺术', code: 'DMA', description: '数字设计与媒体制作' } }),
  ]);
  console.log(`  已创建 ${majors.length} 个专业`);

  // ==================== 5. 课程（10个）====================
  console.log('创建课程...');
  const courses = await Promise.all([
    prisma.course.create({ data: { name: '语文', code: 'YW', type: 'public' } }),
    prisma.course.create({ data: { name: '数学', code: 'SX', type: 'public' } }),
    prisma.course.create({ data: { name: '英语', code: 'YY', type: 'public' } }),
    prisma.course.create({ data: { name: '思想政治', code: 'SZ', type: 'public' } }),
    prisma.course.create({ data: { name: '体育', code: 'TY', type: 'public' } }),
    prisma.course.create({ data: { name: '程序设计基础', code: 'CX', type: 'professional' } }),
    prisma.course.create({ data: { name: '数据库应用', code: 'SJ', type: 'professional' } }),
    prisma.course.create({ data: { name: '幼儿心理学', code: 'XL', type: 'professional' } }),
    prisma.course.create({ data: { name: '网络营销', code: 'YX', type: 'professional' } }),
    prisma.course.create({ data: { name: '平面设计', code: 'MJ', type: 'professional' } }),
  ]);
  console.log(`  已创建 ${courses.length} 门课程`);

  // ==================== 6. 教材信息（10个）====================
  console.log('创建教材信息...');
  const textbooks = await Promise.all([
    prisma.textbook.create({
      data: {
        title: '大学语文（第3版）',
        isbn: '978-7-04-051234-5',
        publisher: '高等教育出版社',
        author: '张建华',
        edition: '第3版',
        publishDate: '2023-08',
        price: 45.00,
        description: '高等院校公共课教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '高等数学基础（第2版）',
        isbn: '978-7-04-052345-6',
        publisher: '高等教育出版社',
        author: '李明华',
        edition: '第2版',
        publishDate: '2023-06',
        price: 52.00,
        description: '高职高专数学教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '实用英语教程',
        isbn: '978-7-5663-1234-7',
        publisher: '外语教学与研究出版社',
        author: '王晓芳',
        edition: '第1版',
        publishDate: '2024-01',
        price: 48.00,
        description: '职业教育英语教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: 'C语言程序设计（第4版）',
        isbn: '978-7-302-06789-8',
        publisher: '清华大学出版社',
        author: '孙志勇',
        edition: '第4版',
        publishDate: '2023-09',
        price: 55.00,
        description: '计算机专业核心课程教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: 'MySQL数据库应用实战',
        isbn: '978-7-115-62345-9',
        publisher: '人民邮电出版社',
        author: '赵德明',
        edition: '第1版',
        publishDate: '2024-03',
        price: 58.00,
        description: '数据库技术实训教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '幼儿心理学教程（修订版）',
        isbn: '978-7-303-23456-0',
        publisher: '北京师范大学出版社',
        author: '刘慧敏',
        edition: '修订版',
        publishDate: '2023-07',
        price: 42.00,
        description: '学前教育专业必修课教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '电子商务实务',
        isbn: '978-7-111-56789-1',
        publisher: '机械工业出版社',
        author: '陈志强',
        edition: '第2版',
        publishDate: '2023-11',
        price: 49.50,
        description: '电商专业核心教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '基础会计学原理',
        isbn: '978-7-300-34567-2',
        publisher: '中国人民大学出版社',
        author: '周丽华',
        edition: '第3版',
        publishDate: '2023-08',
        price: 46.00,
        description: '会计入门教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: 'Photoshop平面设计案例教程',
        isbn: '978-7-5006-7890-3',
        publisher: '中国青年出版社',
        author: '吴美玲',
        edition: '第1版',
        publishDate: '2024-02',
        price: 65.00,
        description: '艺术设计类专业教材',
      },
    }),
    prisma.textbook.create({
      data: {
        title: '思想政治与职业道德',
        isbn: '978-7-04-061234-4',
        publisher: '高等教育出版社',
        author: '郑建国',
        edition: '第2版',
        publishDate: '2023-09',
        price: 38.00,
        description: '德育课程教材',
      },
    }),
  ]);
  console.log(`  已创建 ${textbooks.length} 本教材`);

  // ==================== 7. 培养方案及课程安排 ====================
  console.log('创建培养方案...');

  // 辅助函数：创建课程并自动生成学期记录
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

  // 创建各专业培养方案
  const planComputer = await prisma.trainingPlan.create({
    data: { name: '2024级计算机应用技术培养方案', majorId: majors[0].id, version: 'v1.0' },
  });
  const planEducation = await prisma.trainingPlan.create({
    data: { name: '2024级学前教育培养方案', majorId: majors[1].id, version: 'v1.0' },
  });
  const planEcommerce = await prisma.trainingPlan.create({
    data: { name: '2024级电子商务培养方案', majorId: majors[2].id, version: 'v1.0' },
  });

  // 计算机专业课程
  const csCourses = [];
  for (const item of [
    { planId: planComputer.id, courseId: courses[0].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },
    { planId: planComputer.id, courseId: courses[1].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },
    { planId: planComputer.id, courseId: courses[2].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },
    { planId: planComputer.id, courseId: courses[5].id, startSemester: 1, endSemester: 4, weeklyHours: 6 },
    { planId: planComputer.id, courseId: courses[6].id, startSemester: 3, endSemester: 4, weeklyHours: 4 },
  ]) {
    csCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 教育专业课程
  const eduCourses = [];
  for (const item of [
    { planId: planEducation.id, courseId: courses[0].id, startSemester: 1, endSemester: 4, weeklyHours: 4 },
    { planId: planEducation.id, courseId: courses[3].id, startSemester: 1, endSemester: 4, weeklyHours: 2 },
    { planId: planEducation.id, courseId: courses[4].id, startSemester: 1, endSemester: 6, weeklyHours: 2 },
    { planId: planEducation.id, courseId: courses[7].id, startSemester: 3, endSemester: 6, weeklyHours: 4 },
  ]) {
    eduCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 电商专业课程
  const ecCourses = [];
  for (const item of [
    { planId: planEcommerce.id, courseId: courses[0].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },
    { planId: planEcommerce.id, courseId: courses[1].id, startSemester: 1, endSemester: 2, weeklyHours: 4 },
    { planId: planEcommerce.id, courseId: courses[8].id, startSemester: 2, endSemester: 4, weeklyHours: 4 },
    { planId: planEcommerce.id, courseId: courses[9].id, startSemester: 3, endSemester: 4, weeklyHours: 4 },
  ]) {
    ecCourses.push(await createPlanCourseWithSemesters(item));
  }

  // 教材关联示例
  const allSemesters = await prisma.planCourseSemester.findMany();

  // 为部分课程关联教材
  const textbookMappings = [
    { courseIndex: 0, semester: 1, textbookIndex: 0 },   // 语文 -> 大学语文
    { courseIndex: 1, semester: 1, textbookIndex: 1 },   // 数学 -> 高等数学
    { courseIndex: 2, semester: 1, textbookIndex: 2 },   // 英语 -> 实用英语
    { courseIndex: 3, semester: 1, textbookIndex: 3 },   // 程序设计 -> C语言
    { courseIndex: 4, semester: 3, textbookIndex: 4 },   // 数据库 -> MySQL
    { courseIndex: 7, semester: 3, textbookIndex: 5 },   // 幼儿心理学 -> 心理学教程
    { courseIndex: 8, semester: 2, textbookIndex: 6 },   // 网络营销 -> 电子商务实务
    { courseIndex: 9, semester: 3, textbookIndex: 8 },   // 平面设计 -> Photoshop
  ];

  const courseGroups = [csCourses, eduCourses, ecCourses];
  for (const mapping of textbookMappings) {
    const groupIndex = Math.floor(mapping.courseIndex / 5);
    const localIndex = mapping.courseIndex % 5;
    if (courseGroups[groupIndex] && courseGroups[groupIndex][localIndex]) {
      const sem = allSemesters.find(
        s => s.planCourseId === courseGroups[groupIndex][localIndex].id && s.semester === mapping.semester
      );
      if (sem) {
        await createTextbookLink(sem.id, textbooks[mapping.textbookIndex].id);
      }
    }
  }

  // ==================== 8. 班级（20个）====================
  console.log('创建班级...');
  const classesData = [
    // 2024级 - 10个班级
    { name: '2024级计算机应用1班', year: 2024, majorIdx: 0, collegeIdx: 0, levelIdx: 4, count: 45 },
    { name: '2024级计算机应用2班', year: 2024, majorIdx: 0, collegeIdx: 0, levelIdx: 4, count: 43 },
    { name: '2024级学前教育1班', year: 2024, majorIdx: 1, collegeIdx: 1, levelIdx: 4, count: 48 },
    { name: '2024级学前教育2班', year: 2024, majorIdx: 1, collegeIdx: 1, levelIdx: 4, count: 46 },
    { name: '2024级电子商务1班', year: 2024, majorIdx: 2, collegeIdx: 2, levelIdx: 4, count: 42 },
    { name: '2024级电子商务2班', year: 2024, majorIdx: 2, collegeIdx: 2, levelIdx: 4, count: 40 },
    { name: '2024级会计1班', year: 2024, majorIdx: 3, collegeIdx: 2, levelIdx: 1, count: 50 },
    { name: '2024级会计2班', year: 2024, majorIdx: 3, collegeIdx: 2, levelIdx: 1, count: 48 },
    { name: '2024级数字媒体1班', year: 2024, majorIdx: 4, collegeIdx: 4, levelIdx: 3, count: 35 },
    { name: '2024级数字媒体2班', year: 2024, majorIdx: 4, collegeIdx: 4, levelIdx: 3, count: 33 },

    // 2025级 - 10个班级
    { name: '2025级计算机应用1班', year: 2025, majorIdx: 0, collegeIdx: 0, levelIdx: 4, count: 47 },
    { name: '2025级计算机应用2班', year: 2025, majorIdx: 0, collegeIdx: 0, levelIdx: 4, count: 44 },
    { name: '2025级学前教育1班', year: 2025, majorIdx: 1, collegeIdx: 1, levelIdx: 4, count: 50 },
    { name: '2025级学前教育2班', year: 2025, majorIdx: 1, collegeIdx: 1, levelIdx: 4, count: 49 },
    { name: '2025级电子商务1班', year: 2025, majorIdx: 2, collegeIdx: 2, levelIdx: 4, count: 41 },
    { name: '2025级电子商务2班', year: 2025, majorIdx: 2, collegeIdx: 2, levelIdx: 4, count: 39 },
    { name: '2025级会计1班', year: 2025, majorIdx: 3, collegeIdx: 2, levelIdx: 1, count: 52 },
    { name: '2025级会计2班', year: 2025, majorIdx: 3, collegeIdx: 2, levelIdx: 1, count: 50 },
    { name: '2025级数字媒体1班', year: 2025, majorIdx: 4, collegeIdx: 4, levelIdx: 3, count: 36 },
    { name: '2025级数字媒体2班', year: 2025, majorIdx: 4, collegeIdx: 4, levelIdx: 3, count: 34 },
  ];

  const classes = [];
  for (const c of classesData) {
    classes.push(
      await prisma.class.create({
        data: {
          name: c.name,
          enrollmentYear: c.year,
          durationYears: 3,
          majorId: majors[c.majorIdx].id,
          collegeId: colleges[c.collegeIdx].id,
          trainingLevelId: levels[c.levelIdx].id,
          studentCount: c.count,
          status: 'active',
        },
      })
    );
  }
  console.log(`  已创建 ${classes.length} 个班级`);

  // ==================== 统计信息 ====================
  console.log('\n========== 种子数据统计 ==========');
  const stats = await Promise.all([
    prisma.systemSetting.count(),
    prisma.trainingLevel.count(),
    prisma.college.count(),
    prisma.major.count(),
    prisma.course.count(),
    prisma.textbook.count(),
    prisma.trainingPlan.count(),
    prisma.planCourse.count(),
    prisma.planCourseSemester.count(),
    prisma.planTextbook.count(),
    prisma.class.count(),
  ]);

  console.log(`系统设置: ${stats[0]} 条`);
  console.log(`培养层次: ${stats[1]} 条`);
  console.log(`学院: ${stats[2]} 条`);
  console.log(`专业: ${stats[3]} 条`);
  console.log(`课程: ${stats[4]} 条`);
  console.log(`教材: ${stats[5]} 条`);
  console.log(`培养方案: ${stats[6]} 条`);
  console.log(`方案课程: ${stats[7]} 条`);
  console.log(`学期记录: ${stats[8]} 条`);
  console.log(`教材关联: ${stats[9]} 条`);
  console.log(`班级: ${stats[10]} 条`);
  console.log('================================\n');
  console.log('种子数据创建完成！');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
