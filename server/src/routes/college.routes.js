import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const colleges = await prisma.college.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    
    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(colleges.map(c => c.sortOrder));
    if (sortOrders.size <= 1 && colleges.length > 0) {
      await Promise.all(
        colleges.map((college, index) =>
          prisma.college.update({
            where: { id: college.id },
            data: { sortOrder: index }
          })
        )
      );
      const updatedColleges = await prisma.college.findMany({
        include: { _count: { select: { classes: true } } },
        orderBy: { sortOrder: 'asc' },
      });
      success(res, updatedColleges);
    } else {
      success(res, colleges);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sortOrder } = req.body;
    if (!name) return fail(res, '学院名称不能为空');
    const college = await prisma.college.create({
      data: { name, code, description, sortOrder: sortOrder || 0 },
    });
    
    await createAuditLog({
      action: 'create',
      module: 'college',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: college.id, name, code },
      result: 'success',
      message: `创建学院：${name}`
    });
    
    success(res, college, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'college',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建学院失败：${e.message}`
    });
    if (e.code === 'P2002') return fail(res, '该学院名称已存在');
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, sortOrder } = req.body;
    try {
      const college = await prisma.college.update({
        where: { id: Number(id) },
        data: { name, code, description, sortOrder },
      });
      
      await createAuditLog({
        action: 'update',
        module: 'college',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: college.id, name, code },
        result: 'success',
        message: `更新学院：${name}`
      });
      
      success(res, college, '更新成功');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'college',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新学院失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      if (e.code === 'P2002') return fail(res, '该学院名称已存在');
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.class.count({ where: { collegeId: Number(id) } });
    if (classCount > 0) return fail(res, '该学院下存在班级，无法删除');
    try {
      const college = await prisma.college.findUnique({ where: { id: Number(id) } });
      await prisma.college.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        action: 'delete',
        module: 'college',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: college?.name },
        result: 'success',
        message: `删除学院：${college?.name}`
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      await createAuditLog({
        action: 'delete',
        module: 'college',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除学院失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
