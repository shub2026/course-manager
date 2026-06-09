import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', async (req, res, next) => {
  try {
    const textbooks = await prisma.textbook.findMany({ orderBy: { sortOrder: 'asc' } });
    
    // 检查是否需要重新分配 sortOrder
    const sortOrders = new Set(textbooks.map(t => t.sortOrder));
    if (sortOrders.size <= 1 && textbooks.length > 0) {
      await Promise.all(
        textbooks.map((textbook, index) =>
          prisma.textbook.update({
            where: { id: textbook.id },
            data: { sortOrder: index }
          })
        )
      );
      const updatedTextbooks = await prisma.textbook.findMany({ orderBy: { sortOrder: 'asc' } });
      success(res, updatedTextbooks);
    } else {
      success(res, textbooks);
    }
  } catch (e) { next(e); }
});

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { title, isbn, publisher, author, edition, publishDate, price, category, description, isActive, sortOrder } = req.body;
    if (!title) return fail(res, '书名不能为空');
    const textbook = await prisma.textbook.create({
      data: { title, isbn, publisher, author, edition, publishDate, price: price ? Number(price) : null, category: category || null, description, isActive: isActive !== undefined ? isActive : true, sortOrder: sortOrder ?? 0 },
    });

    await createAuditLog({
      action: 'create',
      module: 'textbook',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: textbook.id, name: title },
      result: 'success',
      message: `创建教材：${title}`
    });

    success(res, textbook, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'textbook',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建教材失败：${e.message}`
    });
    next(e);
  }
});

router.put('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, isbn, publisher, author, edition, publishDate, price, category, description, isActive, sortOrder } = req.body;
    try {
      const textbook = await prisma.textbook.update({
        where: { id: Number(id) },
        data: { title, isbn, publisher, author, edition, publishDate, price: price ? Number(price) : null, category, description, isActive, sortOrder: sortOrder ?? 0 },
      });

      await createAuditLog({
        action: 'update',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: textbook.id, name: title },
        result: 'success',
        message: `更新教材：${title}`
      });

      success(res, textbook, '更新成功');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新教材失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '教材不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const usageCount = await prisma.planTextbook.count({ where: { textbookId: Number(id) } });
    if (usageCount > 0) return fail(res, '该教材已被培养方案引用，无法删除');
    try {
      // 先获取教材信息用于日志记录
      const textbook = await prisma.textbook.findUnique({ where: { id: Number(id) } });
      await prisma.textbook.delete({ where: { id: Number(id) } });

      await createAuditLog({
        action: 'delete',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: textbook?.title },
        result: 'success',
        message: `删除教材：${textbook?.title}`
      });

      success(res, null, '删除成功');
    } catch (e) {
      await createAuditLog({
        action: 'delete',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除教材失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '教材不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

// POST /api/textbooks/:id/toggle-status - 切换启用/停用状态（需要admin权限）
router.post('/:id/toggle-status', roleMiddleware('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      // Get current status and toggle it
      const current = await prisma.textbook.findUnique({ where: { id: Number(id) }, select: { isActive: true, title: true } });
      if (!current) return fail(res, '教材不存在', 404);
      const updated = await prisma.textbook.update({
        where: { id: Number(id) },
        data: { isActive: !current.isActive },
      });

      await createAuditLog({
        action: 'update',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: updated.id, name: current.title, isActive: updated.isActive },
        result: 'success',
        message: `${updated.isActive ? '启用' : '停用'}教材：${current.title}`
      });

      success(res, updated, updated.isActive ? '已启用' : '已停用');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'textbook',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), action: 'toggle-status' },
        result: 'failed',
        message: `切换教材状态失败：${e.message}`
      });
      if (e.code === 'P2025') return fail(res, '教材不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
