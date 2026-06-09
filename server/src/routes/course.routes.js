import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const courses = await prisma.course.findMany({ where, orderBy: { sortOrder: 'asc' } });
    
    // 检查是否需要重新分配 sortOrder（所有值都相同的情况）
    const sortOrders = new Set(courses.map(c => c.sortOrder));
    if (sortOrders.size <= 1 && courses.length > 0) {
      // 所有课程的 sortOrder 都相同，需要重新分配
      await Promise.all(
        courses.map((course, index) =>
          prisma.course.update({
            where: { id: course.id },
            data: { sortOrder: index }
          })
        )
      );
      // 重新查询获取更新后的数据
      const updatedCourses = await prisma.course.findMany({ where, orderBy: { sortOrder: 'asc' } });
      success(res, updatedCourses);
    } else {
      success(res, courses);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, code, type, description, sortOrder } = req.body;
    if (!name) return fail(res, '课程名称不能为空');
    const course = await prisma.course.create({
      data: { name, code, type: type || 'public', description, sortOrder: sortOrder ?? 0 },
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

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, type, description, sortOrder } = req.body;
    try {
      const course = await prisma.course.update({
        where: { id: Number(id) },
        data: { name, code, type, description, sortOrder: sortOrder ?? 0 },
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
    const planCount = await prisma.planCourse.count({ where: { courseId: Number(id) } });
    if (planCount > 0) return fail(res, '该课程已被培养方案使用，无法删除');
    try {
      // 先获取课程信息用于日志记录
      const course = await prisma.course.findUnique({ where: { id: Number(id) } });
      await prisma.course.delete({ where: { id: Number(id) } });

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
