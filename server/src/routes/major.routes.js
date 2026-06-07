import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const majors = await prisma.major.findMany({
      include: { _count: { select: { classes: true, trainingPlans: true } } },
      orderBy: { id: 'asc' },
    });
    success(res, majors);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name) return fail(res, '专业名称不能为空');
    const major = await prisma.major.create({ data: { name, code, description } });
    success(res, major, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    try {
      const major = await prisma.major.update({
        where: { id: Number(id) },
        data: { name, code, description },
      });
      success(res, major, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { majorId: Number(id) } });
    if (classCount > 0) return fail(res, '该专业下存在班级，无法删除');
    try {
      await prisma.major.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
