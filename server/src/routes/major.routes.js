import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const majors = await prisma.major.findMany({
      include: { _count: { select: { classes: true, trainingPlans: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    
    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(majors.map(m => m.sortOrder));
    if (sortOrders.size <= 1 && majors.length > 0) {
      await Promise.all(
        majors.map((major, index) =>
          prisma.major.update({
            where: { id: major.id },
            data: { sortOrder: index }
          })
        )
      );
      const updatedMajors = await prisma.major.findMany({
        include: { _count: { select: { classes: true, trainingPlans: true } } },
        orderBy: { sortOrder: 'asc' },
      });
      success(res, updatedMajors);
    } else {
      success(res, majors);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sortOrder } = req.body;
    if (!name) return fail(res, '专业名称不能为空');
    const major = await prisma.major.create({ data: { name, code, description, sortOrder: sortOrder ?? 0 } });
    success(res, major, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, sortOrder } = req.body;
    try {
      const major = await prisma.major.update({
        where: { id: Number(id) },
        data: { name, code, description, sortOrder: sortOrder ?? 0 },
      });
      success(res, major, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
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
