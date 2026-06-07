import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const plans = await prisma.trainingPlan.findMany({
      include: {
        major: { select: { id: true, name: true } },
        planCourses: { select: { id: true } },
      },
      orderBy: { id: 'asc' },
    });

    // Manually count classes for each plan
    const plansWithCount = await Promise.all(plans.map(async (plan) => {
      const classCount = await prisma.class.count({
        where: { customPlanId: plan.id },
      });
      return {
        ...plan,
        _count: {
          planCourses: plan.planCourses.length,
          classes: classCount,
        },
      };
    }));

    success(res, plansWithCount);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, majorId, version, description } = req.body;
    if (!name || !majorId) return fail(res, '方案名称和专业为必填项');
    const plan = await prisma.trainingPlan.create({
      data: { name, majorId: Number(majorId), version, description },
      include: { major: true },
    });
    success(res, plan, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, majorId, version, description } = req.body;
    try {
      const plan = await prisma.trainingPlan.update({
        where: { id: Number(id) },
        data: { name, majorId: majorId ? Number(majorId) : undefined, version, description },
        include: { major: true },
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

// === 方案课程明细 ===
router.get('/:id/courses', async (req, res, next) => {
  try {
    const { id } = req.params;
    const courses = await prisma.planCourse.findMany({
      where: { planId: Number(id) },
      include: {
        course: { select: { id: true, name: true, code: true, type: true } },
        planTextbooks: {
          include: { textbook: { select: { id: true, title: true, isbn: true, publisher: true } } },
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
    const pc = await prisma.planCourse.create({
      data: {
        planId: Number(id),
        courseId: Number(courseId),
        startSemester: Number(startSemester),
        endSemester: Number(endSemester),
        weeklyHours: Number(weeklyHours),
        weeksPerSemester: weeksPerSemester ? Number(weeksPerSemester) : 18,
      },
      include: { course: true },
    });
    success(res, pc, '添加成功');
  } catch (e) { next(e); }
});

router.put('/courses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startSemester, endSemester, weeklyHours, weeksPerSemester } = req.body;
    try {
      const pc = await prisma.planCourse.update({
        where: { id: Number(id) },
        data: {
          startSemester: startSemester !== undefined ? Number(startSemester) : undefined,
          endSemester: endSemester !== undefined ? Number(endSemester) : undefined,
          weeklyHours: weeklyHours !== undefined ? Number(weeklyHours) : undefined,
          weeksPerSemester: weeksPerSemester !== undefined ? Number(weeksPerSemester) : undefined,
        },
        include: { course: true },
      });
      success(res, pc, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
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

// === 教材关联 ===
router.post('/courses/:id/textbooks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { textbookId, semester, isRequired } = req.body;
    if (!textbookId || !semester) return fail(res, '教材和使用学期为必填项');
    const pt = await prisma.planTextbook.create({
      data: {
        planCourseId: Number(id),
        textbookId: Number(textbookId),
        semester: Number(semester),
        isRequired: isRequired !== false,
      },
      include: { textbook: true },
    });
    success(res, pt, '关联成功');
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
