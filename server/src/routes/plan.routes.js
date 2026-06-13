import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/error.js';
import { createAuditLog } from '../services/audit.service.js';
import { autoFixSortOrder } from '../utils/sort.js';

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
    
    // M5修复：移除GET请求中的sort_order自动修复写操作
    await autoFixSortOrder('training_plans');
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

    // 一次性获取所有在校班级，排除离校状态（is_left_school），避免 N+1 查询
    const allClasses = await prisma.classes.findMany({
      where: { is_left_school: false },
      select: { id: true, major_id: true, training_level_id: true, custom_plan_id: true }
    });

    // 按 sort_order 优先级为每个班级分配唯一方案（与前端 getCurrentPlanName 逻辑一致）
    const classCountMap = {};
    plans.forEach(p => { classCountMap[p.id] = 0; });

    for (const cls of allClasses) {
      if (cls.custom_plan_id) {
        // 有自定义方案：精确匹配
        if (classCountMap[cls.custom_plan_id] !== undefined) {
          classCountMap[cls.custom_plan_id]++;
        }
      } else {
        // 无自定义方案：按 sort_order 顺序找第一个匹配的方案
        for (const plan of plans) {
          if (plan.major_id && cls.major_id === plan.major_id) {
            classCountMap[plan.id]++;
            break;
          }
          if (plan.training_level_id && cls.training_level_id === plan.training_level_id) {
            classCountMap[plan.id]++;
            break;
          }
        }
      }
    }

    const plansWithCount = plans.map(plan => ({
      ...plan,
      courseCount: plan.plan_courses.length,
      classCount: classCountMap[plan.id] || 0,
    }));

    success(res, plansWithCount);
  } catch (e) { next(e); }
});

// #20修复：添加获取单个培养方案的接口
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.training_plans.findUnique({
      where: { id: Number(id) },
      include: {
        majors: { select: { id: true, name: true } },
        colleges: { select: { id: true, name: true } },
        training_levels: { select: { id: true, name: true } },
        plan_courses: { select: { id: true } },
      },
    });

    if (!plan) {
      return fail(res, '培养方案不存在', 404);
    }

    success(res, plan);
  } catch (e) { next(e); }
});

router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, college_id, major_id, training_level_id, version, description } = req.body;
    if (!name) throw new ValidationError('方案名称为必填项');
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (major_id && training_level_id) {
      throw new ValidationError('专业类别和培养层次只能选择一项');
    }
    if (!major_id && !training_level_id) {
      throw new ValidationError('请选择专业类别或培养层次');
    }
    
    // 获取当前最大 sortOrder，新记录排在最后
    const maxSortOrder = await prisma.training_plans.aggregate({
      _max: { sort_order: true },
    });
    const newSortOrder = (maxSortOrder._max.sort_order || 0) + 1;
    
    const plan = await prisma.training_plans.create({
      data: { 
        name, 
        college_id: college_id ? Number(college_id) : null,
        major_id: major_id ? Number(major_id) : null,
        training_level_id: training_level_id ? Number(training_level_id) : null,
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
      colleges: plan.colleges?.name || '未设置',
      majors: plan.majors?.name || '未设置',
      training_levels: plan.training_levels?.name || '未设置',
      version: plan.version,
    };
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      details: logDetails,
      message: `创建培养方案：${plan.name}${plan.colleges?.name ? `（使用部门：${plan.colleges.name}）` : ''}`,
    });
    
    success(res, plan, '创建成功');
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      details: { error: e.message },
    });
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, college_id, major_id, training_level_id, version, description, sort_order } = req.body;
    
    // 排序交换：仅更新 sort_order，跳过其他验证
    if (sort_order !== undefined && name === undefined) {
      try {
        const plan = await prisma.training_plans.update({
          where: { id: Number(id) },
          data: { sort_order: Number(sort_order) },
          include: {
            majors: true,
            colleges: true,
            training_levels: true,
          },
        });
        return success(res, plan, '更新成功');
      } catch (e) {
        if (e.code === 'P2025') return fail(res, '培养方案不存在', 404);
        throw e;
      }
    }
    
    // 验证：专业类别和培养层次只能选择一项（二选一）
    if (major_id && training_level_id) {
      return fail(res, '专业类别和培养层次只能选择一项');
    }
    if (!major_id && !training_level_id) {
      return fail(res, '请选择专业类别或培养层次');
    }
    
    const updateData = { 
      name, 
      college_id: college_id ? Number(college_id) : null,
      major_id: major_id ? Number(major_id) : null,
      training_level_id: training_level_id ? Number(training_level_id) : null,
      version, 
      description,
    };
    
    // 如果传入了 sort_order，则更新它
    if (sort_order !== undefined) {
      updateData.sort_order = Number(sort_order);
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
          from: oldPlan?.colleges?.name || '未设置',
          to: plan.colleges?.name || '未设置',
        };
      }
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'update',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        details: changes,
        message: `更新培养方案：${plan.name}${plan.colleges?.name ? `（使用部门：${plan.colleges.name}）` : ''}`,
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
      details: { error: e.message },
    });
    next(e);
  }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.classes.count({ where: { custom_plan_id: Number(id) } });
    if (classCount > 0) throw new ConflictError('该方案已被班级使用，无法删除');
    try {
      await prisma.training_plans.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        module: 'trainingPlan',
        action: 'delete',
        userId: req.user?.id,
        ip: req.ip,
        result: 'success',
        details: { plan_id: Number(id) },
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') throw new NotFoundError('培养方案');
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      module: 'trainingPlan',
      action: 'delete',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      details: { error: e.message },
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

    // M5修复：移除GET请求中的sort_order自动修复写操作
    success(res, courses);
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/:id/courses', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { course_id, start_semester, end_semester, weekly_hours, weeks_per_semester } = req.body;
    if (!course_id || start_semester === undefined || end_semester === undefined || !weekly_hours) {
      return fail(res, '课程、开课学期、周课时为必填项');
    }
    const weeks = weeks_per_semester ? Number(weeks_per_semester) : 18;
    
    // 使用事务确保数据一致性
    const pc = await prisma.$transaction(async (tx) => {
      // 1. 创建 PlanCourse
      const created = await tx.plan_courses.create({
        data: {
          plan_id: Number(id),
          course_id: Number(course_id),
          start_semester: Number(start_semester),
          end_semester: Number(end_semester),
          weekly_hours: Number(weekly_hours),
          weeks_per_semester: weeks,
        },
        include: { courses: true },
      });

      // 2. 自动创建学期记录
      for (let s = Number(start_semester); s <= Number(end_semester); s++) {
        await tx.plan_course_semesters.create({
          data: {
            plan_course_id: created.id,
            semester: s,
            weekly_hours: Number(weekly_hours),
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
      details: { course_id: pc.course_id },
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
      details: { error: e.message },
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
    const { start_semester, end_semester, weekly_hours, weeks_per_semester, sort_order } = req.body;

    // 先获取当前课程信息
    const currentPc = await prisma.plan_courses.findUnique({
      where: { id: Number(id) },
      include: { plan_course_semesters: true },
    });

    if (!currentPc) {
      return fail(res, '方案课程不存在', 404);
    }

    // 确定新的学期范围
    const newStart = start_semester !== undefined ? Number(start_semester) : currentPc.start_semester;
    const newEnd = end_semester !== undefined ? Number(end_semester) : currentPc.end_semester;
    const newWeeklyHours = weekly_hours !== undefined ? Number(weekly_hours) : currentPc.weekly_hours;
    const newWeeksPerSemester = weeks_per_semester !== undefined ? Number(weeks_per_semester) : currentPc.weeks_per_semester;
    const newSortOrder = sort_order !== undefined ? Number(sort_order) : currentPc.sort_order;

    // 使用事务确保数据一致性
    const pc = await prisma.$transaction(async (tx) => {
      // 1. 更新 PlanCourse
      const updated = await tx.plan_courses.update({
        where: { id: Number(id) },
        data: {
          start_semester: newStart,
          end_semester: newEnd,
          weekly_hours: newWeeklyHours,
          weeks_per_semester: newWeeksPerSemester,
          sort_order: newSortOrder,
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
      details: { course_id: pc.id },
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
      details: { error: e.message },
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
        details: { course_id: Number(id) },
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
      details: { error: e.message },
    });
    next(e);
  }
});

// === 学期明细操作 ===
// POST/PUT/DELETE - 需要admin权限
router.post('/:planId/courses/:courseId/semesters', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { planId, courseId } = req.params;
    const { semester, weekly_hours, weeks_count } = req.body;

    if (!semester || !weekly_hours) {
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
        weekly_hours: Number(weekly_hours),
        weeks_count: weeks_count ? Number(weeks_count) : planCourse.weeks_per_semester,
      },
      create: {
        plan_course_id: Number(courseId),
        semester: Number(semester),
        weekly_hours: Number(weekly_hours),
        weeks_count: weeks_count ? Number(weeks_count) : planCourse.weeks_per_semester,
      },
    });

    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '添加学期安排',
      details: { course_id: Number(courseId), semester },
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
      details: { error: e.message },
    });
    next(e);
  }
});

router.put('/semesters/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { weekly_hours, weeks_count } = req.body;
    const data = {};
    if (weekly_hours !== undefined) data.weekly_hours = Number(weekly_hours);
    if (weeks_count !== undefined) data.weeks_count = Number(weeks_count);

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
      details: { semester_id: Number(id) },
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
      details: { error: e.message },
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
// POST - 需要admin权限（关联教材到学期，先删后增）
router.post('/semesters/:id/textbooks', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { textbook_id, is_required } = req.body;
    if (!textbook_id) return fail(res, '教材为必填项');

    // 校验教材是否存在且已启用
    const textbook = await prisma.textbooks.findUnique({ where: { id: Number(textbook_id) } });
    if (!textbook) return fail(res, '教材不存在');
    if (!textbook.is_active) return fail(res, `教材"${textbook.title}"已停用，无法关联`);

    // 该学期只允许关联一本教材：先删后增（事务保护）
    const pt = await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany({
        where: { semester_id: Number(id) },
      });

      return tx.plan_textbooks.create({
        data: {
          semester_id: Number(id),
          textbook_id: Number(textbook_id),
          is_required: is_required !== false,
        },
        include: { textbooks: true },
      });
    });
    
    await createAuditLog({
      module: 'trainingPlan',
      action: 'create',
      userId: req.user?.id,
      ip: req.ip,
      result: 'success',
      message: '添加教材',
      details: { semester_id: Number(id), textbook_id: Number(textbook_id) },
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
      details: { error: e.message },
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
      details: { semester_id: Number(id) },
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
      details: { error: e.message },
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
        details: { id: Number(id) },
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
      details: { error: e.message },
    });
    next(e);
  }
});

export default router;
