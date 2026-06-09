import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const levels = await prisma.trainingLevel.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    
    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(levels.map(l => l.sortOrder));
    if (sortOrders.size <= 1 && levels.length > 0) {
      await Promise.all(
        levels.map((level, index) =>
          prisma.trainingLevel.update({
            where: { id: level.id },
            data: { sortOrder: index }
          })
        )
      );
      const updatedLevels = await prisma.trainingLevel.findMany({
        include: { _count: { select: { classes: true } } },
        orderBy: { sortOrder: 'asc' },
      });
      success(res, updatedLevels);
    } else {
      success(res, levels);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sortOrder } = req.body;
    if (!name) return fail(res, '层次名称不能为空');
    const level = await prisma.trainingLevel.create({
      data: { name, code, description, sortOrder: sortOrder || 0 },
    });
    success(res, level, '创建成功');
  } catch (e) {
    if (e.code === 'P2002') return fail(res, '该层次名称已存在');
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, sortOrder } = req.body;
    try {
      const level = await prisma.trainingLevel.update({
        where: { id: Number(id) },
        data: { name, code, description, sortOrder },
      });
      success(res, level, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '层次不存在', 404);
      if (e.code === 'P2002') return fail(res, '该层次名称已存在');
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { trainingLevelId: Number(id) } });
    if (classCount > 0) return fail(res, '该层次下存在班级，无法删除');
    try {
      await prisma.trainingLevel.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '层次不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
