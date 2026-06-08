import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { majorId, status } = req.query;
    const where = {};
    if (majorId) where.majorId = Number(majorId);
    if (status) where.status = status;
    const classes = await prisma.class.findMany({
      where,
      include: {
        major: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        trainingLevel: { select: { id: true, name: true } },
        customPlan: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
    success(res, classes);
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
