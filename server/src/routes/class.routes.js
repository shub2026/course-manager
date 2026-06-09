import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

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
    let autoStatus = status;
    if (!autoStatus) {
      const semesterInfo = await getCurrentSemesterInfo();
      autoStatus = calculateClassStatus(Number(enrollmentYear), Number(durationYears), semesterInfo);
    }
    
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
      
      // 始终根据入学年份和学制自动计算状态，忽略前端传来的status
      // 这样可以确保状态始终与当前的学期配置保持一致
      const calcEnrollmentYear = enrollmentYear ? Number(enrollmentYear) : currentClass.enrollmentYear;
      const calcDurationYears = durationYears ? Number(durationYears) : currentClass.durationYears;
      const semesterInfo = await getCurrentSemesterInfo();
      const autoStatus = calculateClassStatus(calcEnrollmentYear, calcDurationYears, semesterInfo);
      
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
          status: autoStatus,
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
