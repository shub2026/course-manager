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
      where.college_id = Number(collegeId);
    }
    
    const plans = await prisma.training_plans.findMany({
      where,
      include: {

        majors: { select: { id: true, name: true } },
        colleges: { select: { id: true, name: true } },
        training_levels: { select: { id: true, name: true } },
        plan_courses: { select: { id: true } },
      },
      orderBy: { sort_order: 'asc' },
    });

    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(plans.map(p => p.sort_order));
    if (sortOrders.size <= 1 && plans.length > 0) {
      await Promise.all(
        plans.map((plan, index) =>
          prisma.training_plans.update({
            where: { id: plan.id },
            data: { sort_order: index }
          })
        )
      );
      // 重新查询获取更新后的数据
      const updatedPlans = await prisma.training_plans.findMany({
        where,
        include: {

          majors: { select: { id: true, name: true } },
          colleges: { select: { id: true, name: true } },
          training_levels: { select: { id: true, name: true } },
          plan_courses: { select: { id: true } },
        },
        orderBy: { sort_order: 'asc' },
      });
      
      const plansWithCount = await Promise.all(updatedPlans.map(async (plan) => {
        const customClassCount = await prisma.classes.count({
          where: { custom_plan_id: plan.id },
        });
        
        let defaultClassCount = 0;
        if (plan.major_id) {
          defaultClassCount = await prisma.classes.count({
            where: { major_id: plan.major_id, custom_plan_id: null },
          });
        } else if (plan.training_level_id) {
          defaultClassCount = await prisma.classes.count({
            where: { training_level_id: plan.training_level_id, custom_plan_id: null },
          });
        }
        
        return {
          ...plan,
          _count: {
            plan_courses: plan.plan_courses.length,
            classes: customClassCount + defaultClassCount,
          },
        };
      }));
      
      success(res, plansWithCount);
    } else {
      const plansWithCount = await Promise.all(plans.map(async (plan) => {
        const customClassCount = await prisma.classes.count({
          where: { custom_plan_id: plan.id },
        });
        
        let defaultClassCount = 0;
        if (plan.major_id) {
          defaultClassCount = await prisma.classes.count({
            where: { major_id: plan.major_id, custom_plan_id: null },
          });
        } else if (plan.training_level_id) {
          defaultClassCount = await prisma.classes.count({
            where: { training_level_id: plan.training_level_id, custom_plan_id: null },
          });
        }
        
        return {
          ...plan,
          _count: {
            plan_courses: plan.plan_courses.length,
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
    const maxSortOrder = await prisma.training_plans.aggregate({
      _max: { sort_order: true },
    });
    const newSortOrder = (maxSortOrder._max.sort_order || 0) + 1;
    
    const plan = await prisma.training_plans.create({
      data: { 
        name, 
        college_id: collegeId ? Number(collegeId) : null,
        major_id: majorId ? Number(majorId) : null,
        training_level_id: trainingLevelId ? Number(trainingLevelId) : null,
        version, 
        description,
        sort_order: newSortOrder,
      },
      include: { 
        majors: true,
        colleges: true,
        training_levels: true,
      },
    });
    
    // 构建详细的日志信息
    const logDetails = {
      id: plan.id,
      name: plan.name,
      colleges: plan.college?.name || '未设置',
      majors: plan.major?.name || '未设置',
      training_levels: plan.trainingLevel?.name || '未设置',
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
      college_id: collegeId ? Number(collegeId) : null,
      major_id: majorId ? Number(majorId) : null,
      training_level_id: trainingLevelId ? Number(trainingLevelId) : null,
      version, 
      description,
    };
    
    // 如果传入了 sortOrder，则更新它
    if (sortOrder !== undefined) {
      updateData.sort_order = Number(sortOrder);
    }
    
    try {
      // 先获取更新前的数据用于对比
      const oldPlan = await prisma.training_plans.findUnique({
        where: { id: Number(id) },
        include: { colleges: true },
      });
      
      const plan = await prisma.training_plans.update({
        where: { id: Number(id) },
        data: updateData,
        include: { 
          majors: true,
          colleges: true,
          training_levels: true,
        },
      });
      
      // 构建详细的变更日志
      const changes = {
        id: plan.id,
        name: plan.name,
      };
      
      // 记录使用部门变更
      if (oldPlan?.college_id !== plan.college_id) {
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
    const classCount = await prisma.classes.count({ where: { custom_plan_id: Number(id) } });
    if (classCount > 0) return fail(res, '该方案已被班级使用，无法删除');
    try {
      await prisma.training_plans.delete({ where: { id: Number(id) } });
      
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
    const courses = await prisma.plan_courses.findMany({
      where: { plan_id: Number(id) },
      include: {

        courses: { select: { id: true, name: true, code: true, type: true } },
        plan_course_semesters: {
          include: {

            plan_textbooks: {
              include: { textbooks: { select: { id: true, title: true, isbn: true, publisher: true } } },
            },
          },
          orderBy: { semester: 'asc' },
        },
      },
      orderBy: [
        { sort_order: 'asc' },
        { id: 'asc' }
      ],
    });

    // 检查是否需要重新分配 sortOrder（所有值都相同的情况）
    const sortOrders = new Set(courses.map(c => c.sort_order));
    if (sortOrders.size <= 1) {
      // 所有课程的 sortOrder 都相同，需要重新分配
      await Promise.all(
        courses.map((course, index) =>
          prisma.plan_courses.update({
            where: { id: course.id },
            data: { sort_order: index }
          })
        )
      );
      // 重新查询获取更新后的数据
      const updatedCourses = await prisma.plan_courses.findMany({
        where: { plan_id: Number(id) },
        include: {

          courses: { select: { id: true, name: true, code: true, type: true } },
          plan_course_semesters: {
            include: {

              textbooks: {
                include: { textbooks: { select: { id: true, title: true, isbn: true, publisher: true } } },
              },
            },
            orderBy: { semester: 'asc' },
          },
        },
        orderBy: { sort_order: 'asc' },
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
          plan_id: Number(id),
          course_id: Number(courseId),
          start_semester: Number(startSemester),
          end_semester: Number(endSemester),
          weekly_hours: Number(weeklyHours),
          weeks_per_semester: weeks,
        },
        include: { courses: true },
      });

      // 2. 自动创建学期记录
      for (let s = Number(startSemester); s <= Number(endSemester); s++) {
        await tx.plan_course_semesters.create({
          data: {
            plan_course_id: created.id,
            semester: s,
            weekly_hours: Number(weeklyHours),
            weeks_count: weeks,
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
    const currentPc = await prisma.plan_courses.findUnique({
      where: { id: Number(id) },
      include: { plan_course_semesters: true },
    });

    if (!currentPc) {
      return fail(res, '方案课程不存在', 404);
    }

    // 确定新的学期范围
    const newStart = startSemester !== undefined ? Number(startSemester) : currentPc.startSemester;
    const newEnd = endSemester !== undefined ? Number(endSemester) : currentPc.endSemester;
    const newWeeklyHours = weeklyHours !== undefined ? Number(weeklyHours) : currentPc.weeklyHours;
    const newWeeksPerSemester = weeksPerSemester !== undefined ? Number(weeksPerSemester) : currentPc.weeksPerSemester;
    const newSortOrder = sortOrder !== undefined ? Number(sortOrder) : currentPc.sort_order;

    // 使用事务确保数据一致性
    const pc = await prisma.$transaction(async (tx) => {
      // 1. 更新 PlanCourse
      const updated = await tx.planCourse.update({
        where: { id: Number(id) },
        data: {
          start_semester: newStart,
          end_semester: newEnd,
          weekly_hours: newWeeklyHours,
          weeks_per_semester: newWeeksPerSemester,
          sort_order: newSortOrder,
          weeks_per_semester: newWeeksPerSemester,
        },
        include: { courses: true },
      });

      // 2. 同步学期记录 - 先删除所有旧记录
      await tx.plan_course_semesters.deleteMany({
        where: { plan_course_id: Number(id) },
      });

      // 3. 重新创建所有学期记录
      for (let s = newStart; s <= newEnd; s++) {
        await tx.plan_course_semesters.create({
          data: {
            plan_course_id: Number(id),
            semester: s,
            weekly_hours: newWeeklyHours,
            weeks_count: newWeeksPerSemester,
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
      await prisma.plan_courses.delete({ where: { id: Number(id) } });
      
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
    const planCourse = await prisma.plan_courses.findFirst({
      where: {
        id: Number(courseId),
        plan_id: Number(planId),
      },
    });

    if (!planCourse) {
      return fail(res, '方案课程不存在', 404);
    }

    // 使用 upsert: 存在则更新,不存在则创建
    const sem = await prisma.plan_course_semesters.upsert({
      where: {
        plan_course_id_semester: {
          plan_course_id: Number(courseId),
          semester: Number(semester),
        },
      },
      update: {
        weekly_hours: Number(weeklyHours),
        weeks_count: weeksCount ? Number(weeksCount) : planCourse.weeks_per_semester,
      },
      create: {
        plan_course_id: Number(courseId),
        semester: Number(semester),
        weekly_hours: Number(weeklyHours),
        weeks_count: weeksCount ? Number(weeksCount) : planCourse.weeks_per_semester,
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
    if (weeklyHours !== undefined) data.weekly_hours = Number(weeklyHours);
    if (weeksCount !== undefined) data.weeks_count = Number(weeksCount);

    const sem = await prisma.plan_course_semesters.update({
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
    const semesters = await prisma.plan_course_semesters.findMany({
      where: { plan_courses: { plan_id: Number(id) } },
      select: { semester: true, weeks_count: true },
      distinct: ['semester'],
      orderBy: { semester: 'asc' },
    });
    // 去重后返回每学期周数
    const map = {};
    semesters.forEach(s => {
      if (!map[s.semester] || map[s.semester] < s.weeks_count) {
        map[s.semester] = s.weeks_count;
      }
    });
    success(res, Object.entries(map).map(([semester, weeks_count]) => ({
      semester: Number(semester),
      weeks_count,
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
    await prisma.plan_textbooks.deleteMany({
      where: { semester_id: Number(id) },
    });

    const pt = await prisma.plan_textbooks.create({
      data: {
        semester_id: Number(id),
        textbook_id: Number(textbookId),
        is_required: isRequired !== false,
      },
      include: { textbooks: true },
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
    await prisma.plan_textbooks.deleteMany({
      where: { semester_id: Number(id) },
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
      await prisma.plan_textbooks.delete({ where: { id: Number(id) } });
      
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
