import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/error.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { createAuditLog } from '../services/audit.service.js';
import { validatePagination } from '../middleware/pagination.js';
import { getActiveClassFilter } from '../services/class.service.js';
import { sanitizeBody } from '../middleware/xss.js'; // H7修复：XSS防护中间件

const router = Router();

/**
 * 根据入学年份和学制自动判断班级状态
 * 
 * 计算规则：
 * - 学生于入学年份的9月入学，每个学年包含2个学期（秋季、春季）
 * - 在读学期总数 = 学制年数 × 2
 * - 班级在校条件：当前相对学期序号 <= 学制 × 2
 * 
 * 示例（2023年入学，3年制，当前为2025-2026学年第2学期）：
 * - 2023级：年级 = 2025 - 2023 + 1 = 3年级，当前学期 = (3-1)×2 + 2 = 第6学期
 * - 总学期数 = 3 × 2 = 6学期
 * - 第6学期 <= 6学期 → 在校（还未毕业）
 * - 到下一学期（2026-2027学年第1学期，即第7学期）才变为已毕业
 * 
 * @param {number} enrollmentYear - 入学年份
 * @param {number} durationYears - 学制（年）
 * @param {object} semesterInfo - 当前学期信息（可选），格式：{ value: "YYYY-YYYY-N" }
 * @returns {string} 'active' 或 'graduated'
 */
function calculateClassStatus(enrollmentYear, durationYears, semesterInfo = null) {
  // 如果没有提供学期信息，使用系统设置中的当前学期
  let startYear;
  
  if (semesterInfo && semesterInfo.startYear) {
    // getCurrentSemesterInfo() 返回的格式：{ startYear, endYear, semesterIndex, raw, label }
    startYear = semesterInfo.startYear;
  } else if (semesterInfo && semesterInfo.value) {
    // 兼容旧格式：从学期配置字符串中提取起始学年，如 "2025-2026-2" → 2025
    startYear = Number(semesterInfo.value.split('-')[0]);
  } else {
    // 降级方案：使用当前年份估算
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    // 如果是9月之后，认为是新学年的开始
    startYear = currentMonth >= 9 ? currentYear : currentYear - 1;
  }
  
  // 计算当前年级
  const grade = startYear - enrollmentYear + 1;
  
  // 计算当前是该班级的第几个学期
  // 注意：这里我们只需要知道是否超过最大学期数即可
  // 实际学期序号需要加上semesterIndex，但判断毕业只需比较年级
  
  // 如果年级已经超过学制，说明已毕业
  // 如果年级等于学制，还在最后一年（包括最后两年的两个学期）
  // 如果年级小于学制，说明还在读
  
  return grade <= durationYears ? 'active' : 'graduated';
}

/**
 * GET /api/classes/stats - 轻量级统计接口
 * 返回在读班级数、在读学生数，供首页概览使用
 */
router.get('/stats', async (req, res, next) => {
  try {
    const activeFilter = await getActiveClassFilter();

    const activeClasses = await prisma.classes.findMany({
      where: activeFilter,
      select: { student_count: true },
    });

    const totalClasses = activeClasses.length;
    const totalStudents = activeClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);

    success(res, { totalClasses, totalStudents });
  } catch (e) { next(e); }
});

router.get('/', validatePagination(100), async (req, res, next) => {
  try {
    const { name, majorId, collegeId, status, trainingLevelId, planId, enrollmentYear, page, pageSize } = req.query;
    const pageNum = page ? Number(page) : 1;
    const pageSizeNum = pageSize ? Number(pageSize) : 20;
    
    const where = {};
    if (name) where.name = { contains: name };
    
    // 处理特殊值 "null" 表示筛选空值字段
    if (majorId === 'null') {
      where.major_id = null;
    } else if (majorId) {
      where.major_id = Number(majorId);
    }
    
    if (collegeId === 'null') {
      where.college_id = null;
    } else if (collegeId) {
      where.college_id = Number(collegeId);
    }
    
    // 状态筛选：基于入学年份和学制动态计算，而非直接过滤数据库字段
    // 因为数据库中的 status 可能过期，实际状态由 calculateClassStatus() 动态决定
    // 特殊状态 'left_school' 通过 is_left_school 字段控制
    let dynamicStatusFilter = null;
    if (status === 'null') {
      // 筛选无法计算状态的记录（缺少入学年份或学制，且非离校）
      dynamicStatusFilter = [
        { enrollment_year: null, is_left_school: false },
        { duration_years: null, is_left_school: false },
      ];
    } else if (status === 'left_school') {
      // 离校状态：直接通过 is_left_school 字段过滤
      dynamicStatusFilter = [{ is_left_school: true }];
    } else if (status === 'active' || status === 'graduated') {
      const semesterInfo = await getCurrentSemesterInfo();
      if (semesterInfo) {
        const startYear = semesterInfo.startYear;
        // 获取所有不重复的学制值，用于构建动态过滤条件
        const durations = await prisma.classes.findMany({
          select: { duration_years: true },
          distinct: ['duration_years'],
        });
        const durationValues = durations.map(d => d.duration_years).filter(d => d != null);
        
        // 根据 calculateClassStatus 的逻辑：
        // active:    grade <= duration_years → enrollment_year >= startYear - duration_years + 1
        // graduated: grade > duration_years  → enrollment_year < startYear - duration_years + 1
        // 同时排除离校班级（is_left_school = false）
        dynamicStatusFilter = durationValues.map(d => ({
          duration_years: d,
          is_left_school: false,
          enrollment_year: status === 'active'
            ? { gte: startYear - d + 1 }
            : { lt: startYear - d + 1 },
        }));
      }
    }
    
    if (trainingLevelId === 'null') {
      where.training_level_id = null;
    } else if (trainingLevelId) {
      where.training_level_id = Number(trainingLevelId);
    }
    
    if (enrollmentYear === 'null') {
      where.enrollment_year = null;
    } else if (enrollmentYear) {
      where.enrollment_year = Number(enrollmentYear);
    }
    
    // 如果指定了培养方案ID，需要特殊处理
    if (planId) {
      // 特殊值 "none" 表示筛选完全未关联任何培养方案的班级
      if (planId === 'none') {
        // 获取所有培养方案，构建排除条件
        const allPlans = await prisma.training_plans.findMany({
          select: { id: true, major_id: true, training_level_id: true },
        });
        
        // 条件1：customPlanId 必须为 null
        where.custom_plan_id = null;
        
        // 条件2：班级的专业不能匹配任何按专业关联的方案
        // 条件3：班级的层次不能匹配任何按层次关联的方案
        // 使用 NOT + OR 来排除会匹配到方案的班级
        const notConditions = [];
        
        // 按专业匹配的条件
        const majorIdsWithPlans = [...new Set(allPlans.filter(p => p.major_id).map(p => p.major_id))];
        if (majorIdsWithPlans.length > 0) {
          notConditions.push({ major_id: { in: majorIdsWithPlans } });
        }
        
        // 按层次匹配的条件
        const levelIdsWithPlans = [...new Set(allPlans.filter(p => p.training_level_id).map(p => p.training_level_id))];
        if (levelIdsWithPlans.length > 0) {
          notConditions.push({ training_level_id: { in: levelIdsWithPlans } });
        }
        
        // 如果有需要排除的条件，添加 NOT 子句
        if (notConditions.length > 0) {
          where.NOT = { OR: notConditions };
        }
      } else {
        const planIdNum = Number(planId);
        
        // 获取该方案的信息，确定关联方式
        const plan = await prisma.training_plans.findUnique({
          where: { id: planIdNum },
          select: { major_id: true, training_level_id: true },
        });
        
        if (plan) {
          // 筛选条件（优先级从高到低）：
          // 1. customPlanId = planId（明确指定该方案为特殊方案）
          const conditions = [
            { custom_plan_id: planIdNum },
          ];
          
          // 2. 如果方案按专业关联，匹配该专业且未指定特殊方案的班级
          if (plan.major_id) {
            conditions.push({
              major_id: plan.major_id,
              custom_plan_id: null,
            });
          }
          
          // 3. 如果方案按培养层次关联，匹配该层次且未指定特殊方案的班级
          if (plan.training_level_id) {
            conditions.push({
              training_level_id: plan.training_level_id,
              custom_plan_id: null,
            });
          }
          
          where.OR = conditions;
        } else {
          // 如果方案不存在，返回空结果
          return success(res, { items: [], total: 0 });
        }
      }
    }
    
    // 将动态状态筛选条件合并到 WHERE 子句中
    // 使用 AND 组合以避免与 planId 筛选器的 OR 冲突
    let finalWhere = where;
    if (dynamicStatusFilter) {
      finalWhere = {
        AND: [
          where,
          { OR: dynamicStatusFilter },
        ],
      };
    }

    // 获取总数
    const total = await prisma.classes.count({ where: finalWhere });
    
    // 获取分页数据
    const classes = await prisma.classes.findMany({
      where: finalWhere,
      include: {
        majors: { select: { id: true, name: true } },
        colleges: { select: { id: true, name: true } },
        training_levels: { select: { id: true, name: true } },
        training_plans: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    });
    
    // 动态计算每个班级的状态，确保状态与当前学期配置一致
    // H8修复：使用展开运算符创建新对象，避免直接修改Prisma查询结果
    // is_left_school 优先级最高，直接标记为 'left_school'
    const semesterInfo = await getCurrentSemesterInfo();
    const classesWithDynamicStatus = classes.map(cls => {
      let status;
      if (cls.is_left_school) {
        status = 'left_school';
      } else if (cls.enrollment_year && cls.duration_years) {
        status = calculateClassStatus(cls.enrollment_year, cls.duration_years, semesterInfo);
      }
      return { ...cls, status };
    });

    // 获取所有不重复的入学年份（用于前端筛选器，不受分页影响）
    const distinctYears = await prisma.classes.findMany({
      select: { enrollment_year: true },
      distinct: ['enrollment_year'],
      orderBy: { enrollment_year: 'desc' },
    });
    const allEnrollmentYears = distinctYears
      .map(c => c.enrollment_year)
      .filter(y => y != null);

    success(res, { items: classesWithDynamicStatus, total, allEnrollmentYears });
  } catch (e) { next(e); }
});

router.post('/', roleMiddleware('admin', 'super_admin'), sanitizeBody, async (req, res, next) => {
  try {
    const { name, enrollment_year, duration_years, major_id, college_id, training_level_id, student_count, custom_plan_id, is_left_school } = req.body;
    if (!name || !enrollment_year || !duration_years || !training_level_id) {
      throw new ValidationError('班级名称、入学年份、学制、培养层次为必填项');
    }

    // 状态计算：is_left_school 优先级最高，其余由入学年份+学制自动推算
    const leftSchool = !!is_left_school;
    let autoStatus;
    if (leftSchool) {
      autoStatus = 'left_school';
    } else {
      const semesterInfo = await getCurrentSemesterInfo();
      autoStatus = calculateClassStatus(Number(enrollment_year), Number(duration_years), semesterInfo);
    }

    const cls = await prisma.classes.create({
      data: {
        name,
        enrollment_year: Number(enrollment_year),
        duration_years: Number(duration_years),
        major_id: major_id ? Number(major_id) : null,
        college_id: college_id ? Number(college_id) : null,
        training_level_id: Number(training_level_id),
        student_count: Number(student_count) || 0,
        custom_plan_id: custom_plan_id ? Number(custom_plan_id) : null,
        status: autoStatus,
        is_left_school: leftSchool,
      },
      include: { majors: true, colleges: true, training_levels: true, training_plans: true },
    });

    await createAuditLog({
      action: 'create',
      module: 'class',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: cls.id, name },
      result: 'success',
      message: `创建班级：${name}`
    });

    success(res, cls, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'class',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建班级失败：${e.message}`
    });
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), sanitizeBody, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, enrollment_year, duration_years, major_id, college_id, training_level_id, student_count, custom_plan_id, is_left_school } = req.body;
    try {
      // 获取当前班级信息
      const currentClass = await prisma.classes.findUnique({ where: { id: Number(id) } });
      if (!currentClass) throw new NotFoundError('班级');

      // 状态计算：is_left_school 优先级最高，其余由入学年份+学制自动推算
      const leftSchool = is_left_school !== undefined ? !!is_left_school : currentClass.is_left_school;
      let autoStatus;
      if (leftSchool) {
        autoStatus = 'left_school';
      } else {
        const calcEnrollmentYear = enrollment_year ? Number(enrollment_year) : currentClass.enrollment_year;
        const calcDurationYears = duration_years ? Number(duration_years) : currentClass.duration_years;
        const semesterInfo = await getCurrentSemesterInfo();
        autoStatus = calculateClassStatus(calcEnrollmentYear, calcDurationYears, semesterInfo);
      }

      // M8修复：统一处理undefined字段，使用展开运算符只传递有值的字段
      const updateData = {
        status: autoStatus,
        is_left_school: leftSchool,
      };
      
      if (name !== undefined) updateData.name = name;
      if (enrollment_year !== undefined) updateData.enrollment_year = Number(enrollment_year);
      if (duration_years !== undefined) updateData.duration_years = Number(duration_years);
      if (major_id !== undefined) updateData.major_id = major_id ? Number(major_id) : null;
      if (college_id !== undefined) updateData.college_id = college_id ? Number(college_id) : null;
      if (training_level_id !== undefined) updateData.training_level_id = training_level_id ? Number(training_level_id) : null;
      if (student_count !== undefined) updateData.student_count = Number(student_count);
      if (custom_plan_id !== undefined) updateData.custom_plan_id = custom_plan_id ? Number(custom_plan_id) : null;

      const cls = await prisma.classes.update({
        where: { id: Number(id) },
        data: updateData,
        include: { majors: true, colleges: true, training_levels: true, training_plans: true },
      });

      await createAuditLog({
        action: 'update',
        module: 'class',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: cls.id, name },
        result: 'success',
        message: `更新班级：${name}`
      });

      success(res, cls, '更新成功');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'class',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新班级失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '班级不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      // 先获取班级信息用于日志记录
      const cls = await prisma.classes.findUnique({ where: { id: Number(id) } });
      await prisma.classes.delete({ where: { id: Number(id) } });

      await createAuditLog({
        action: 'delete',
        module: 'class',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: cls?.name },
        result: 'success',
        message: `删除班级：${cls?.name}`
      });

      success(res, null, '删除成功');
    } catch (e) {
      await createAuditLog({
        action: 'delete',
        module: 'class',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除班级失败：${e.message}`
      });
      if (e.code === 'P2025') throw new NotFoundError('班级');
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
