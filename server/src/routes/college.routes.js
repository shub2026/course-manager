import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const colleges = await prisma.college.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    success(res, colleges);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, description, sortOrder } = req.body;
    if (!name) return fail(res, '学院名称不能为空');
    const college = await prisma.college.create({
      data: { name, code, description, sortOrder: sortOrder || 0 },
    });
    success(res, college, '创建成功');
  } catch (e) {
    if (e.code === 'P2002') return fail(res, '该学院名称已存在');
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, sortOrder } = req.body;
    try {
      const college = await prisma.college.update({
        where: { id: Number(id) },
        data: { name, code, description, sortOrder },
      });
      success(res, college, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      if (e.code === 'P2002') return fail(res, '该学院名称已存在');
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { collegeId: Number(id) } });
    if (classCount > 0) return fail(res, '该学院下存在班级，无法删除');
    try {
      await prisma.college.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
