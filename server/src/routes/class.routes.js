import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

/**
 * 根据入学年份和学制自动判断班级状态
 * @param {number} enrollmentYear - 入学年份
 * @param {number} durationYears - 学制（年）
 * @returns {string} 'active' 或 'graduated'
 */
function calculateClassStatus(enrollmentYear, durationYears) {
  const currentYear = new Date().getFullYear();
  const graduationYear = enrollmentYear + durationYears;
  return currentYear < graduationYear ? 'active' : 'graduated';
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
      // majorId 是必填字段(Int类型)，使用 lt: 1 来筛选未设置的情况
      where.majorId = { lt: 1 };
    } else if (majorId) {
      where.majorId = Number(majorId);
    }
    
    if (collegeId === 'null') {
      where.collegeId = null;
    } else if (collegeId) {
      where.collegeId = Number(collegeId);
    }
    
    if (status === 'null') {
      where.status = null;
    } else if (status) {
      where.status = status;
    }
    
    if (trainingLevelId === 'null') {
      where.trainingLevelId = null;
    } else if (trainingLevelId) {
      where.trainingLevelId = Number(trainingLevelId);
    }
    
    if (enrollmentYear === 'null') {
      where.enrollmentYear = null;
    } else if (enrollmentYear) {
      where.enrollmentYear = Number(enrollmentYear);
    }
    
    // 如果指定了培养方案ID，需要特殊处理
    if (planId) {
      // 特殊值 "none" 表示筛选完全未关联任何培养方案的班级
      if (planId === 'none') {
        // 获取所有培养方案，构建排除条件
        const allPlans = await prisma.trainingPlan.findMany({
          select: { id: true, majorId: true, trainingLevelId: true },
        });
        
        // 条件1：customPlanId 必须为 null
        where.customPlanId = null;
        
        // 条件2：班级的专业不能匹配任何按专业关联的方案
        // 条件3：班级的层次不能匹配任何按层次关联的方案
        // 使用 NOT + OR 来排除会匹配到方案的班级
        const notConditions = [];
        
        // 按专业匹配的条件
        const majorIdsWithPlans = [...new Set(allPlans.filter(p => p.majorId).map(p => p.majorId))];
        if (majorIdsWithPlans.length > 0) {
          notConditions.push({ majorId: { in: majorIdsWithPlans } });
        }
        
        // 按层次匹配的条件
        const levelIdsWithPlans = [...new Set(allPlans.filter(p => p.trainingLevelId).map(p => p.trainingLevelId))];
        if (levelIdsWithPlans.length > 0) {
          notConditions.push({ trainingLevelId: { in: levelIdsWithPlans } });
        }
        
        // 如果有需要排除的条件，添加 NOT 子句
        if (notConditions.length > 0) {
          where.NOT = { OR: notConditions };
        }
      } else {
        const planIdNum = Number(planId);
        
        // 获取该方案的信息，确定关联方式
        const plan = await prisma.trainingPlan.findUnique({
          where: { id: planIdNum },
          select: { majorId: true, trainingLevelId: true },
        });
        
        if (plan) {
          // 筛选条件（优先级从高到低）：
          // 1. customPlanId = planId（明确指定该方案为特殊方案）
          const conditions = [
            { customPlanId: planIdNum },
          ];
          
          // 2. 如果方案按专业关联，匹配该专业且未指定特殊方案的班级
          if (plan.majorId) {
            conditions.push({
              majorId: plan.majorId,
              customPlanId: null,
            });
          }
          
          // 3. 如果方案按培养层次关联，匹配该层次且未指定特殊方案的班级
          if (plan.trainingLevelId) {
            conditions.push({
              trainingLevelId: plan.trainingLevelId,
              customPlanId: null,
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
    const total = await prisma.class.count({ where });
    
    // 获取分页数据
    const classes = await prisma.class.findMany({
      where,
      include: {
        major: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        trainingLevel: { select: { id: true, name: true } },
        customPlan: { select: { id: true, name: true } },
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
    const autoStatus = status || calculateClassStatus(Number(enrollmentYear), Number(durationYears));
    
    const cls = await prisma.class.create({
      data: {
        name,
        enrollmentYear: Number(enrollmentYear),
        durationYears: Number(durationYears),
        majorId: majorId ? Number(majorId) : null,
        collegeId: collegeId ? Number(collegeId) : null,
        trainingLevelId: Number(trainingLevelId),
        studentCount: Number(studentCount) || 0,
        customPlanId: customPlanId ? Number(customPlanId) : null,
        status: autoStatus,
      },
      include: { major: true, college: true, trainingLevel: true, customPlan: true },
    });
    success(res, cls, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, enrollmentYear, durationYears, majorId, collegeId, trainingLevelId, studentCount, customPlanId, status } = req.body;
    try {
      // 获取当前班级信息
      const currentClass = await prisma.class.findUnique({ where: { id: Number(id) } });
      if (!currentClass) return fail(res, '班级不存在', 404);
      
      // 如果未提供状态，但提供了入学年份或学制，则自动计算状态
      let finalStatus = status;
      if (!finalStatus && (enrollmentYear || durationYears)) {
        const calcEnrollmentYear = enrollmentYear ? Number(enrollmentYear) : currentClass.enrollmentYear;
        const calcDurationYears = durationYears ? Number(durationYears) : currentClass.durationYears;
        finalStatus = calculateClassStatus(calcEnrollmentYear, calcDurationYears);
      }
      
      const cls = await prisma.class.update({
        where: { id: Number(id) },
        data: {
          name,
          enrollmentYear: enrollmentYear ? Number(enrollmentYear) : undefined,
          durationYears: durationYears ? Number(durationYears) : undefined,
          majorId: majorId !== undefined ? (majorId ? Number(majorId) : null) : undefined,
          collegeId: collegeId !== undefined ? (collegeId ? Number(collegeId) : null) : undefined,
          trainingLevelId: trainingLevelId !== undefined ? (trainingLevelId ? Number(trainingLevelId) : null) : undefined,
          studentCount: studentCount !== undefined ? Number(studentCount) : undefined,
          customPlanId: customPlanId !== undefined && customPlanId !== null ? Number(customPlanId) : null,
          status: finalStatus,
        },
        include: { major: true, college: true, trainingLevel: true, customPlan: true },
      });
      success(res, cls, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '班级不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.class.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '班级不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
