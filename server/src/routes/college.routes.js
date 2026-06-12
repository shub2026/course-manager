import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const colleges = await prisma.colleges.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sort_order: 'asc' },
    });
    
    // 检查是否需要重新分配 sortOrder（非连续唯一序列时需要修复）
    const needsReassignment = colleges.length > 0 && colleges.some((c, i) => c.sort_order !== i);
    if (needsReassignment) {
      await Promise.all(
        colleges.map((college, index) =>
          prisma.colleges.update({
            where: { id: college.id },
            data: { sort_order: index }
          })
        )
      );
      const updatedColleges = await prisma.colleges.findMany({
        include: { _count: { select: { classes: true } } },
        orderBy: { sort_order: 'asc' },
      });
      const formattedColleges = updatedColleges.map(college => ({
        ...college,
        classCount: college._count?.classes || 0,
      }));
      success(res, formattedColleges);
    } else {
      const formattedColleges = colleges.map(college => ({
        ...college,
        classCount: college._count?.classes || 0,
      }));
      success(res, formattedColleges);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sort_order } = req.body;
    if (!name) return fail(res, '学院名称不能为空');
    const college = await prisma.colleges.create({
      data: { name, code, description, sort_order: sort_order || 0 },
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
    const { name, code, description, sort_order } = req.body;
    try {
      const college = await prisma.colleges.update({
        where: { id: Number(id) },
        data: { name, code, description, sort_order },
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
    const classCount = await prisma.classes.count({ where: { college_id: Number(id) } });
    if (classCount > 0) return fail(res, '该学院下存在班级，无法删除');
    try {
      const college = await prisma.colleges.findUnique({ where: { id: Number(id) } });
      await prisma.colleges.delete({ where: { id: Number(id) } });
      
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
