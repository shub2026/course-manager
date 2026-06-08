import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.trainingPlan.findMany({
      include: {
        major: { select: { id: true, name: true } },
        trainingLevel: { select: { id: true, name: true } },
        planCourses: { select: { id: true } },
      },
      orderBy: { id: 'asc' },
    });

    const plansWithCount = await Promise.all(plans.map(async (plan) => {
      // 1. 统计明确指定该方案为特殊方案的班级
      const customClassCount = await prisma.class.count({
        where: { customPlanId: plan.id },
      });
      
      // 2. 统计通过专业默认匹配且未指定特殊方案的班级
      // 只有当方案关联了专业时才统计
      let defaultClassCount = 0;
      if (plan.majorId) {
        defaultClassCount = await prisma.class.count({
          where: { 
            majorId: plan.majorId,
            customPlanId: null,
          },
        });
      }
      
      return {
        ...plan,
        _count: {
          planCourses: plan.planCourses.length,
          classes: customClassCount + defaultClassCount,
        },
      };
    }));

    success(res, plansWithCount);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, majorId, trainingLevelId, version, description } = req.body;
    if (!name) return fail(res, '方案名称为必填项');
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (majorId && trainingLevelId) {
      return fail(res, '专业类别和培养层次只能选择一项');
    }
    if (!majorId && !trainingLevelId) {
      return fail(res, '请选择专业类别或培养层次');
    }
    
    const plan = await prisma.trainingPlan.create({
      data: { 
        name, 
        majorId: majorId ? Number(majorId) : null,
        trainingLevelId: trainingLevelId ? Number(trainingLevelId) : null,
        version, 
        description 
      },
      include: { 
        major: true,
        trainingLevel: true,
      },
    });
    success(res, plan, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, majorId, trainingLevelId, version, description } = req.body;
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (majorId && trainingLevelId) {
      return fail(res, '专业类别和培养层次只能选择一项');
    }
    if (!majorId && !trainingLevelId) {
      return fail(res, '请选择专业类别或培养层次');
    }
    
    try {
      const plan = await prisma.trainingPlan.update({
        where: { id: Number(id) },
        data: { 
          name, 
          majorId: majorId ? Number(majorId) : null,
          trainingLevelId: trainingLevelId ? Number(trainingLevelId) : null,
          version, 
          description 
        },
        include: { 
          major: true,
          trainingLevel: true,
        },
      });
      success(res, plan, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { customPlanId: Number(id) } });
    if (classCount > 0) return fail(res, '该方案已被班级使用，无法删除');
    try {
      await prisma.trainingPlan.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

// === 方案课程明细（含学期记录） ===
router.get('/:id/courses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const courses = await prisma.planCourse.findMany({
      where: { planId: Number(id) },
      include: {
        course: { select: { id: true, name: true, code: true, type: true } },
        planCourseSemesters: {
          include: {
            textbooks: {
              include: { textbook: { select: { id: true, title: true, isbn: true, publisher: true } } },
            },
          },
          orderBy: { semester: 'asc' },
        },
      },
      orderBy: { startSemester: 'asc' },
    });
    success(res, courses);
  } catch (e) { next(e); }
});

router.post('/:id/courses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { courseId, startSemester, endSemester, weeklyHours, weeksPerSemester } = req.body;
    if (!courseId || startSemester === undefined || endSemester === undefined || !weeklyHours) {
      return fail(res, '课程、开课学期、周课时为必填项');
    }
    const weeks = weeksPerSemester ? Number(weeksPerSemester) : 18;
    
    // 使用事务确保数据一致性
    const pc = await prisma.$transaction(async (tx) => {
      // 1. 创建 PlanCourse
      const created = await tx.planCourse.create({
        data: {
          planId: Number(id),
          courseId: Number(courseId),
          startSemester: Number(startSemester),
          endSemester: Number(endSemester),
          weeklyHours: Number(weeklyHours),
          weeksPerSemester: weeks,
        },
        include: { course: true },
      });

      // 2. 自动创建学期记录
      for (let s = Number(startSemester); s <= Number(endSemester); s++) {
        await tx.planCourseSemester.create({
          data: {
            planCourseId: created.id,
            semester: s,
            weeklyHours: Number(weeklyHours),
            weeksCount: weeks,
          },
        });
      }

      return created;
    });

    success(res, pc, '添加成功');
  } catch (e) { 
    // 如果是唯一约束冲突,返回友好提示
    if (e.code === 'P2002') {
      return fail(res, '该课程已在该方案中存在', 400);
    }
    next(e); 
  }
});

router.put('/courses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startSemester, endSemester, weeklyHours, weeksPerSemester } = req.body;

    // 先获取当前课程信息
    const currentPc = await prisma.planCourse.findUnique({
      where: { id: Number(id) },
      include: { planCourseSemesters: true },
    });

    if (!currentPc) {
      return fail(res, '方案课程不存在', 404);
    }

    // 确定新的学期范围
    const newStart = startSemester !== undefined ? Number(startSemester) : currentPc.startSemester;
    const newEnd = endSemester !== undefined ? Number(endSemester) : currentPc.endSemester;
    const newWeeklyHours = weeklyHours !== undefined ? Number(weeklyHours) : currentPc.weeklyHours;
    const newWeeksPerSemester = weeksPerSemester !== undefined ? Number(weeksPerSemester) : currentPc.weeksPerSemester;

    // 使用事务确保数据一致性
    const pc = await prisma.$transaction(async (tx) => {
      // 1. 更新 PlanCourse
      const updated = await tx.planCourse.update({
        where: { id: Number(id) },
        data: {
          startSemester: newStart,
          endSemester: newEnd,
          weeklyHours: newWeeklyHours,
          weeksPerSemester: newWeeksPerSemester,
        },
        include: { course: true },
      });

      // 2. 同步学期记录 - 先删除所有旧记录
      await tx.planCourseSemester.deleteMany({
        where: { planCourseId: Number(id) },
      });

      // 3. 重新创建所有学期记录
      for (let s = newStart; s <= newEnd; s++) {
        await tx.planCourseSemester.create({
          data: {
            planCourseId: Number(id),
            semester: s,
            weeklyHours: newWeeklyHours,
            weeksCount: newWeeksPerSemester,
          },
        });
      }

      return updated;
    });

    success(res, pc, '更新成功');
  } catch (e) {
    if (e.code === 'P2025') return fail(res, '方案课程不存在', 404);
    next(e);
  }
});

router.delete('/courses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.planCourse.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

// === 学期明细操作 ===
router.post('/:planId/courses/:courseId/semesters', async (req, res, next) => {
  try {
    const { planId, courseId } = req.params;
    const { semester, weeklyHours, weeksCount } = req.body;

    if (!semester || !weeklyHours) {
      return fail(res, '学期和周课时为必填项');
    }

    // 验证 PlanCourse 是否存在
    const planCourse = await prisma.planCourse.findFirst({
      where: {
        id: Number(courseId),
        planId: Number(planId),
      },
    });

    if (!planCourse) {
      return fail(res, '方案课程不存在', 404);
    }

    // 使用 upsert: 存在则更新,不存在则创建
    const sem = await prisma.planCourseSemester.upsert({
      where: {
        planCourseId_semester: {
          planCourseId: Number(courseId),
          semester: Number(semester),
        },
      },
      update: {
        weeklyHours: Number(weeklyHours),
        weeksCount: weeksCount ? Number(weeksCount) : planCourse.weeksPerSemester,
      },
      create: {
        planCourseId: Number(courseId),
        semester: Number(semester),
        weeklyHours: Number(weeklyHours),
        weeksCount: weeksCount ? Number(weeksCount) : planCourse.weeksPerSemester,
      },
    });

    success(res, sem, '创建成功');
  } catch (e) {
    next(e);
  }
});

router.put('/semesters/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { weeklyHours, weeksCount } = req.body;
    const data = {};
    if (weeklyHours !== undefined) data.weeklyHours = Number(weeklyHours);
    if (weeksCount !== undefined) data.weeksCount = Number(weeksCount);

    const sem = await prisma.planCourseSemester.update({
      where: { id: Number(id) },
      data,
    });
    success(res, sem, '更新成功');
  } catch (e) {
    if (e.code === 'P2025') return fail(res, '学期记录不存在', 404);
    next(e);
  }
});

// 获取方案所有学期的周数设置
router.get('/:id/semesters', async (req, res, next) => {
  try {
    const { id } = req.params;
    const semesters = await prisma.planCourseSemester.findMany({
      where: { planCourse: { planId: Number(id) } },
      select: { semester: true, weeksCount: true },
      distinct: ['semester'],
      orderBy: { semester: 'asc' },
    });
    // 去重后返回每学期周数
    const map = {};
    semesters.forEach(s => {
      if (!map[s.semester] || map[s.semester] < s.weeksCount) {
        map[s.semester] = s.weeksCount;
      }
    });
    success(res, Object.entries(map).map(([semester, weeksCount]) => ({
      semester: Number(semester),
      weeksCount,
    })));
  } catch (e) { next(e); }
});

// === 教材关联（关联到学期） ===
router.post('/semesters/:id/textbooks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { textbookId, isRequired } = req.body;
    if (!textbookId) return fail(res, '教材为必填项');

    // 该学期只允许关联一本教材：先删后增
    await prisma.planTextbook.deleteMany({
      where: { semesterId: Number(id) },
    });

    const pt = await prisma.planTextbook.create({
      data: {
        semesterId: Number(id),
        textbookId: Number(textbookId),
        isRequired: isRequired !== false,
      },
      include: { textbook: true },
    });
    success(res, pt, '关联成功');
  } catch (e) { next(e); }
});

router.delete('/semesters/:id/textbooks', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.planTextbook.deleteMany({
      where: { semesterId: Number(id) },
    });
    success(res, null, '取消关联成功');
  } catch (e) { next(e); }
});

router.delete('/textbooks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.planTextbook.delete({ where: { id: Number(id) } });
      success(res, null, '取消关联成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '教材关联不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
