import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const courses = await prisma.course.findMany({ where, orderBy: { sortOrder: 'asc' } });
    success(res, courses);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, type, description, sortOrder } = req.body;
    if (!name) return fail(res, '课程名称不能为空');
    const course = await prisma.course.create({
      data: { name, code, type: type || 'public', description, sortOrder: sortOrder ?? 0 },
    });
    success(res, course, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, type, description, sortOrder } = req.body;
    try {
      const course = await prisma.course.update({
        where: { id: Number(id) },
        data: { name, code, type, description, sortOrder: sortOrder ?? 0 },
      });
      success(res, course, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const planCount = await prisma.planCourse.count({ where: { courseId: Number(id) } });
    if (planCount > 0) return fail(res, '该课程已被培养方案使用，无法删除');
    try {
      await prisma.course.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
