import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { majorId, collegeId, status, trainingLevelId, planId, enrollmentYear, page, pageSize } = req.query;
    const pageNum = page ? Number(page) : 1;
    const pageSizeNum = pageSize ? Number(pageSize) : 20;
    
    const where = {};
    if (majorId) where.majorId = Number(majorId);
    if (collegeId) where.collegeId = Number(collegeId);
    if (status) where.status = status;
    if (trainingLevelId) where.trainingLevelId = Number(trainingLevelId);
    if (enrollmentYear) where.enrollmentYear = Number(enrollmentYear);
    
    // 如果指定了培养方案ID，需要特殊处理
    if (planId) {
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
    const { name, enrollmentYear, durationYears, majorId, collegeId, trainingLevelId, studentCount, customPlanId } = req.body;
    if (!name || !enrollmentYear || !durationYears || !majorId) {
      return fail(res, '班级名称、入学年份、学制、专业为必填项');
    }
    const cls = await prisma.class.create({
      data: {
        name,
        enrollmentYear: Number(enrollmentYear),
        durationYears: Number(durationYears),
        majorId: Number(majorId),
        collegeId: collegeId ? Number(collegeId) : null,
        trainingLevelId: trainingLevelId ? Number(trainingLevelId) : null,
        studentCount: Number(studentCount) || 0,
        customPlanId: customPlanId ? Number(customPlanId) : null,
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
      const cls = await prisma.class.update({
        where: { id: Number(id) },
        data: {
          name,
          enrollmentYear: enrollmentYear ? Number(enrollmentYear) : undefined,
          durationYears: durationYears ? Number(durationYears) : undefined,
          majorId: majorId ? Number(majorId) : undefined,
          collegeId: collegeId !== undefined ? (collegeId ? Number(collegeId) : null) : undefined,
          trainingLevelId: trainingLevelId !== undefined ? (trainingLevelId ? Number(trainingLevelId) : null) : undefined,
          studentCount: studentCount !== undefined ? Number(studentCount) : undefined,
          customPlanId: customPlanId !== undefined && customPlanId !== null ? Number(customPlanId) : null,
          status,
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
