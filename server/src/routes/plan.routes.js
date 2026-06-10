import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问（用于查询）
router.get('/', async (req, res, next) => {
  try {
    const { collegeId } = req.query;
    const where = {};
    
    // 如果传入了部门ID，进行筛选
    if (collegeId) {
      where.collegeId = Number(collegeId);
    }
    
    const plans = await prisma.trainingPlan.findMany({
      where,
      include: {
        major: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        trainingLevel: { select: { id: true, name: true } },
        planCourses: { select: { id: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(plans.map(p => p.sortOrder));
    if (sortOrders.size <= 1 && plans.length > 0) {
      await Promise.all(
        plans.map((plan, index) =>
          prisma.trainingPlan.update({
            where: { id: plan.id },
            data: { sortOrder: index }
          })
        )
      );
      // 重新查询获取更新后的数据
      const updatedPlans = await prisma.trainingPlan.findMany({
        where,
        include: {
          major: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          trainingLevel: { select: { id: true, name: true } },
          planCourses: { select: { id: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });
      
      const plansWithCount = await Promise.all(updatedPlans.map(async (plan) => {
        const customClassCount = await prisma.class.count({
          where: { customPlanId: plan.id },
        });
        
        let defaultClassCount = 0;
        if (plan.majorId) {
          defaultClassCount = await prisma.class.count({
            where: { majorId: plan.majorId, customPlanId: null },
          });
        } else if (plan.trainingLevelId) {
          defaultClassCount = await prisma.class.count({
            where: { trainingLevelId: plan.trainingLevelId, customPlanId: null },
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
    } else {
      const plansWithCount = await Promise.all(plans.map(async (plan) => {
        const customClassCount = await prisma.class.count({
          where: { customPlanId: plan.id },
        });
        
        let defaultClassCount = 0;
        if (plan.majorId) {
          defaultClassCount = await prisma.class.count({
            where: { majorId: plan.majorId, customPlanId: null },
          });
        } else if (plan.trainingLevelId) {
          defaultClassCount = await prisma.class.count({
            where: { trainingLevelId: plan.trainingLevelId, customPlanId: null },
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
    }
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, collegeId, majorId, trainingLevelId, version, description } = req.body;
    if (!name) return fail(res, '方案名称为必填项');
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (majorId && trainingLevelId) {
      return fail(res, '专业类别和培养层次只能选择一项');
    }
    if (!majorId && !trainingLevelId) {
      return fail(res, '请选择专业类别或培养层次');
    }
    
    // 获取当前最大 sortOrder，新记录排在最后
    const maxSortOrder = await prisma.trainingPlan.aggregate({
      _max: { sortOrder: true },
    });
    const newSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;
    
    const plan = await prisma.trainingPlan.create({
      data: { 
        name, 
        collegeId: collegeId ? Number(collegeId) : null,
        majorId: majorId ? Number(majorId) : null,
        trainingLevelId: trainingLevelId ? Number(trainingLevelId) : null,
        version, 
        description,
        sortOrder: newSortOrder,
      },
      include: { 
        major: true,
        college: true,
        trainingLevel: true,
      },
    });
    
    // 构建详细的日志信息
    const logDetails = {
      id: plan.id,
      name: plan.name,
      college: plan.college?.name || '未设置',
      major: plan.major?.name || '未设置',
      trainingLevel: plan.trainingLevel?.name || '未设置',
      version: plan.version,
    };
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      details: JSON.stringify(logDetails),
      message: `创建培养方案：${plan.name}${plan.college?.name ? `（使用部门：${plan.college.name}）` : ''}`,
    });
    
    success(res, plan, '创建成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      details: `创建培养方案失败: ${e.message}`,
    });
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, collegeId, majorId, trainingLevelId, version, description, sortOrder } = req.body;
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (majorId && trainingLevelId) {
      return fail(res, '专业类别和培养层次只能选择一项');
    }
    if (!majorId && !trainingLevelId) {
      return fail(res, '请选择专业类别或培养层次');
    }
    
    const updateData = { 
      name, 
      collegeId: collegeId ? Number(collegeId) : null,
      majorId: majorId ? Number(majorId) : null,
      trainingLevelId: trainingLevelId ? Number(trainingLevelId) : null,
      version, 
      description,
    };
    
    // 如果传入了 sortOrder，则更新它
    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder);
    }
    
    try {
      // 先获取更新前的数据用于对比
      const oldPlan = await prisma.trainingPlan.findUnique({
        where: { id: Number(id) },
        include: { college: true },
      });
      
      const plan = await prisma.trainingPlan.update({
        where: { id: Number(id) },
        data: updateData,
        include: { 
          major: true,
          college: true,
          trainingLevel: true,
        },
      });
      
      // 构建详细的变更日志
      const changes = {
        id: plan.id,
        name: plan.name,
      };
      
      // 记录使用部门变更
      if (oldPlan?.collegeId !== plan.collegeId) {
        changes.collegeChange = {
          from: oldPlan?.college?.name || '未设置',
          to: plan.college?.name || '未设置',
        };
      }
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'update',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        details: JSON.stringify(changes),
        message: `更新培养方案：${plan.name}${plan.college?.name ? `（使用部门：${plan.college.name}）` : ''}`,
      });
      
      success(res, plan, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案不存在', 404);
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'update',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      details: `更新培养方案失败: ${e.message}`,
    });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { customPlanId: Number(id) } });
    if (classCount > 0) return fail(res, '该方案已被班级使用，无法删除');
    try {
      await prisma.trainingPlan.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'delete',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        details: `删除培养方案 ID: ${id}`,
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案不存在', 404);
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      details: `删除培养方案失败: ${e.message}`,
    });
    next(e);
  }
});

// === 方案课程明细（含学期记录） ===
// GET - 所有登录用户可访问
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
      orderBy: [
        { sortOrder: 'asc' },
        { id: 'asc' }
      ],
    });

    // 检查是否需要重新分配 sortOrder（所有值都相同的情况）
    const sortOrders = new Set(courses.map(c => c.sortOrder));
    if (sortOrders.size <= 1) {
      // 所有课程的 sortOrder 都相同，需要重新分配
      await Promise.all(
        courses.map((course, index) =>
          prisma.planCourse.update({
            where: { id: course.id },
            data: { sortOrder: index }
          })
        )
      );
      // 重新查询获取更新后的数据
      const updatedCourses = await prisma.planCourse.findMany({
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
        orderBy: { sortOrder: 'asc' },
      });
      success(res, updatedCourses);
    } else {
      success(res, courses);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/:id/courses', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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

    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '为培养方案添加课程',
      details: `为培养方案添加课程 ID: ${pc.courseId}`,
    });
    
    success(res, pc, '添加成功');
  } catch (e) { 
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '为培养方案添加课程失败',
      details: `为培养方案添加课程失败: ${e.message}`,
    });
    // 如果是唯一约束冲突,返回友好提示
    if (e.code === 'P2002') {
      return fail(res, '该课程已在该方案中存在', 400);
    }
    next(e); 
  }
});

router.put('/courses/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startSemester, endSemester, weeklyHours, weeksPerSemester, sortOrder } = req.body;

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
    const newSortOrder = sortOrder !== undefined ? Number(sortOrder) : currentPc.sortOrder;

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
          sortOrder: newSortOrder,
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

    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'update',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '更新培养方案课程',
      details: `更新培养方案课程 ID: ${pc.id}`,
    });
    
    success(res, pc, '更新成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'update',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '更新培养方案课程失败',
      details: `更新培养方案课程失败: ${e.message}`,
    });
    if (e.code === 'P2025') return fail(res, '方案课程不存在', 404);
    next(e);
  }
});

router.delete('/courses/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.planCourse.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'delete',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        message: '删除培养方案课程',
        details: `删除培养方案课程 ID: ${id}`,
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '方案课程不存在', 404);
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '删除培养方案课程失败',
      details: `删除培养方案课程失败: ${e.message}`,
    });
    next(e);
  }
});

// === 学期明细操作 ===
// POST/PUT/DELETE - 需要admin权限
router.post('/:planId/courses/:courseId/semesters', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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

    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '添加学期安排',
      details: `为课程 ID: ${courseId} 添加学期 ${semester} 安排`,
    });
    
    success(res, sem, '创建成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '添加学期安排失败',
      details: `添加学期安排失败: ${e.message}`,
    });
    next(e);
  }
});

router.put('/semesters/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'update',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '更新学期安排',
      details: `更新学期安排 ID: ${id}`,
    });
    
    success(res, sem, '更新成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'update',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '更新学期安排失败',
      details: `更新学期安排失败: ${e.message}`,
    });
    if (e.code === 'P2025') return fail(res, '学期记录不存在', 404);
    next(e);
  }
});

// GET - 所有登录用户可访问
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
// POST/PUT/DELETE - 需要admin权限
router.post('/semesters/:id/textbooks', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '添加教材',
      details: `为学期 ID: ${id} 添加教材 ID: ${textbookId}`,
    });
    
    success(res, pt, '关联成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '添加教材失败',
      details: `添加教材失败: ${e.message}`,
    });
    next(e);
  }
});

router.delete('/semesters/:id/textbooks', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.planTextbook.deleteMany({
      where: { semesterId: Number(id) },
    });
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '删除教材',
      details: `删除学期 ID: ${id} 的教材`,
    });
    
    success(res, null, '取消关联成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '删除教材失败',
      details: `删除教材失败: ${e.message}`,
    });
    next(e);
  }
});

router.delete('/textbooks/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.planTextbook.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'delete',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        message: '删除培养方案教材',
        details: `删除培养方案教材 ID: ${id}`,
      });
      
      success(res, null, '取消关联成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '教材关联不存在', 404);
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: '删除培养方案教材失败',
      details: `删除培养方案教材失败: ${e.message}`,
    });
    next(e);
  }
});

export default router;
