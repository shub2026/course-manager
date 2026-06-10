import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { createAuditLog } from '../services/audit.service.js';

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
  
  if (semesterInfo && semesterInfo.value) {
    // 从学期配置中提取起始学年，如 "2025-2026-2" → 2025
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

router.get('/', async (req, res, next) => {
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
    
    if (status === 'null') {
      where.status = null;
    } else if (status) {
      where.status = status;
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
    
    // 获取总数
    const total = await prisma.classes.count({ where });
    
    // 获取分页数据
    const classes = await prisma.classes.findMany({
      where,
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
    
    success(res, { items: classes, total });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, enrollmentYear, durationYears, majorId, collegeId, trainingLevelId, studentCount, customPlanId, status } = req.body;
    if (!name || !enrollmentYear || !durationYears || !trainingLevelId) {
      return fail(res, '班级名称、入学年份、学制、培养层次为必填项');
    }

    // 如果未提供状态，则根据入学年份和学制自动计算
    let autoStatus = status;
    if (!autoStatus) {
      const semesterInfo = await getCurrentSemesterInfo();
      autoStatus = calculateClassStatus(Number(enrollmentYear), Number(durationYears), semesterInfo);
    }

    const cls = await prisma.classes.create({
      data: {
        name,
        enrollment_year: Number(enrollmentYear),
        duration_years: Number(durationYears),
        major_id: majorId ? Number(majorId) : null,
        college_id: collegeId ? Number(collegeId) : null,
        training_level_id: Number(trainingLevelId),
        student_count: Number(studentCount) || 0,
        custom_plan_id: customPlanId ? Number(customPlanId) : null,
        status: autoStatus,
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

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, enrollmentYear, durationYears, majorId, collegeId, trainingLevelId, studentCount, customPlanId, status } = req.body;
    try {
      // 获取当前班级信息
      const currentClass = await prisma.classes.findUnique({ where: { id: Number(id) } });
      if (!currentClass) return fail(res, '班级不存在', 404);

      // 始终根据入学年份和学制自动计算状态，忽略前端传来的status
      // 这样可以确保状态始终与当前的学期配置保持一致
      const calcEnrollmentYear = enrollmentYear ? Number(enrollmentYear) : currentClass.enrollment_year;
      const calcDurationYears = durationYears ? Number(durationYears) : currentClass.duration_years;
      const semesterInfo = await getCurrentSemesterInfo();
      const autoStatus = calculateClassStatus(calcEnrollmentYear, calcDurationYears, semesterInfo);

      const cls = await prisma.classes.update({
        where: { id: Number(id) },
        data: {
          name,
          enrollment_year: enrollmentYear ? Number(enrollmentYear) : undefined,
          duration_years: durationYears ? Number(durationYears) : undefined,
          major_id: majorId !== undefined ? (majorId ? Number(majorId) : null) : undefined,
          college_id: collegeId !== undefined ? (collegeId ? Number(collegeId) : null) : undefined,
          training_level_id: trainingLevelId !== undefined ? (trainingLevelId ? Number(trainingLevelId) : null) : undefined,
          student_count: studentCount !== undefined ? Number(studentCount) : undefined,
          custom_plan_id: customPlanId !== undefined ? (customPlanId ? Number(customPlanId) : null) : undefined,
          status: autoStatus,
        },
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

router.delete('/:id', async (req, res, next) => {
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
      if (e.code === 'P2025') return fail(res, '班级不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
