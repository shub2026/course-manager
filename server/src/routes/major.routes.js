import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    // M5修复：移除GET请求中的sort_order自动修复写操作
    const majors = await prisma.majors.findMany({
      include: { _count: { select: { classes: true, training_plans: true } } },
      orderBy: { sort_order: 'asc' },
    });
    
    const formattedMajors = majors.map(major => ({
      ...major,
      classCount: major._count?.classes || 0,
      planCount: major._count?.training_plans || 0,
    }));
    success(res, formattedMajors);
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, description, sort_order } = req.body;
    if (!name) return fail(res, '专业名称不能为空');
    const major = await prisma.majors.create({ data: { name, code, description, sort_order: sort_order ?? 0 } });
    
    // 记录审计日志
    await createAuditLog({
      action: 'create',
      module: 'major',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: major.id, name, code },
      result: 'success',
      message: `创建专业：${name}`
    });
    
    success(res, major, '创建成功');
  } catch (e) {
    // 记录失败日志
    await createAuditLog({
      action: 'create',
      module: 'major',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建专业失败：${e.message}`
    });
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
    try {
      const major = await prisma.majors.update({
        where: { id: Number(id) },
        data,
      });
      
      // 记录审计日志
      await createAuditLog({
        action: 'update',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: major.id, name, code },
        result: 'success',
        message: `更新专业：${name}`
      });
      
      success(res, major, '更新成功');
    } catch (e) {
      // 记录失败日志
      await createAuditLog({
        action: 'update',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新专业失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const classCount = await prisma.classes.count({ where: { major_id: Number(id) } });
    if (classCount > 0) return fail(res, '该专业下存在班级，无法删除');
    try {
      // 先获取专业信息用于日志记录
      const major = await prisma.majors.findUnique({ where: { id: Number(id) } });
      await prisma.majors.delete({ where: { id: Number(id) } });
      
      // 记录审计日志
      await createAuditLog({
        action: 'delete',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: major?.name },
        result: 'success',
        message: `删除专业：${major?.name}`
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      // 记录失败日志
      await createAuditLog({
        action: 'delete',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除专业失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
