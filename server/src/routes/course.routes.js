import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';
import { autoFixSortOrder } from '../utils/sort.js';
import { sanitizeBody } from '../middleware/xss.js'; // H7修复：XSS防护中间件

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    await autoFixSortOrder('courses', type ? { type } : {});
    const courses = await prisma.courses.findMany({ where, orderBy: { sort_order: 'asc' } });
    success(res, courses);
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), sanitizeBody, async (req, res, next) => {
  try {
    const { name, code, type, description, sort_order } = req.body;
    if (!name) return fail(res, '课程名称不能为空');
    const maxSort = await prisma.courses.aggregate({ _max: { sort_order: true } });
    const newSortOrder = sort_order !== undefined ? Number(sort_order) : (maxSort._max.sort_order || 0) + 1;
    const course = await prisma.courses.create({
      data: { name, code, type: type || 'public', description, sort_order: newSortOrder },
    });

    await createAuditLog({
      action: 'create',
      module: 'course',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: course.id, name, code },
      result: 'success',
      message: `创建课程：${name}`
    });

    success(res, course, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'course',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建课程失败：${e.message}`
    });
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), sanitizeBody, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, type, description, sort_order } = req.body;
    // 过滤 undefined，避免 Prisma v6 对 undefined 值的严格处理
    const data = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (type !== undefined) data.type = type;
    if (description !== undefined) data.description = description;
    if (sort_order !== undefined) data.sort_order = Number(sort_order);
    try {
      const course = await prisma.courses.update({
        where: { id: Number(id) },
        data,
      });

      await createAuditLog({
        action: 'update',
        module: 'course',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: course.id, name, code },
        result: 'success',
        message: `更新课程：${name}`
      });

      success(res, course, '更新成功');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'course',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新课程失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const planCount = await prisma.plan_courses.count({ where: { course_id: Number(id) } });
    if (planCount > 0) return fail(res, '该课程已被培养方案使用，无法删除');
    try {
      // 先获取课程信息用于日志记录
      const course = await prisma.courses.findUnique({ where: { id: Number(id) } });
      await prisma.courses.delete({ where: { id: Number(id) } });

      await createAuditLog({
        action: 'delete',
        module: 'course',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: course?.name },
        result: 'success',
        message: `删除课程：${course?.name}`
      });

      success(res, null, '删除成功');
    } catch (e) {
      await createAuditLog({
        action: 'delete',
        module: 'course',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除课程失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '课程不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
