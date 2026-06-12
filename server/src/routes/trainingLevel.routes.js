import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const levels = await prisma.training_levels.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sort_order: 'asc' },
    });
    
    // 检查是否需要重新分配 sortOrder（非连续唯一序列时需要修复）
    const needsReassignment = levels.length > 0 && levels.some((l, i) => l.sort_order !== i);
    if (needsReassignment) {
      await Promise.all(
        levels.map((level, index) =>
          prisma.training_levels.update({
            where: { id: level.id },
            data: { sort_order: index }
          })
        )
      );
      const updatedLevels = await prisma.training_levels.findMany({
        include: { _count: { select: { classes: true } } },
        orderBy: { sort_order: 'asc' },
      });
      const formattedLevels = updatedLevels.map(level => ({
        ...level,
        classCount: level._count?.classes || 0,
      }));
      success(res, formattedLevels);
    } else {
      const formattedLevels = levels.map(level => ({
        ...level,
        classCount: level._count?.classes || 0,
      }));
      success(res, formattedLevels);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sort_order } = req.body;
    if (!name) return fail(res, '层次名称不能为空');
    const level = await prisma.training_levels.create({
      data: { name, code, description, sort_order: sort_order || 0 },
    });
    await createAuditLog({
      action: 'create',
      module: 'training_level',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: level.id, name },
      result: 'success',
      message: `创建培养层次：${name}`,
    });
    success(res, level, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'training_level',
      userId: req.user?.id,
      ip: req.ip,
      details: { name },
      result: 'failed',
      message: e.code === 'P2002' ? `创建培养层次失败：${name} 已存在` : `创建培养层次失败: ${e.message}`,
    });
    if (e.code === 'P2002') return fail(res, '该层次名称已存在');
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, sort_order } = req.body;
    // 过滤 undefined，避免 Prisma v6 对 undefined 值的严格处理
    const data = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (description !== undefined) data.description = description;
    if (sort_order !== undefined) data.sort_order = Number(sort_order);
    console.log('[DEBUG trainingLevel PUT] req.body:', JSON.stringify(req.body));
    console.log('[DEBUG trainingLevel PUT] data:', JSON.stringify(data));
    try {
      const level = await prisma.training_levels.update({
        where: { id: Number(id) },
        data,
      });
      await createAuditLog({
        action: 'update',
        module: 'training_level',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name },
        result: 'success',
        message: `更新培养层次：${name}`,
      });
      success(res, level, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '层次不存在', 404);
      if (e.code === 'P2002') return fail(res, '该层次名称已存在');
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      action: 'update',
      module: 'training_level',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: Number(req.params.id) },
      result: 'failed',
      message: `更新培养层次失败: ${e.message}`,
    });
    next(e);
  }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.classes.count({ where: { training_level_id: Number(id) } });
    if (classCount > 0) return fail(res, '该层次下存在班级，无法删除');
    try {
      await prisma.training_levels.delete({ where: { id: Number(id) } });
      await createAuditLog({
        action: 'delete',
        module: 'training_level',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'success',
        message: `删除培养层次 ID: ${id}`,
      });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '层次不存在', 404);
      throw e;
    }
  } catch (e) {
    await createAuditLog({
      action: 'delete',
      module: 'training_level',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: Number(req.params.id) },
      result: 'failed',
      message: `删除培养层次失败: ${e.message}`,
    });
    next(e);
  }
});

export default router;
