import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const textbooks = await prisma.textbook.findMany({ orderBy: { id: 'asc' } });
    success(res, textbooks);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, isbn, publisher, author, edition, publishDate, price, description } = req.body;
    if (!title) return fail(res, '书名不能为空');
    const textbook = await prisma.textbook.create({
      data: { title, isbn, publisher, author, edition, publishDate, price: price ? Number(price) : null, description },
    });
    success(res, textbook, '创建成功');
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, isbn, publisher, author, edition, publishDate, price, description } = req.body;
    try {
      const textbook = await prisma.textbook.update({
        where: { id: Number(id) },
        data: { title, isbn, publisher, author, edition, publishDate, price: price ? Number(price) : null, description },
      });
      success(res, textbook, '更新成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '教材不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const usageCount = await prisma.planTextbook.count({ where: { textbookId: Number(id) } });
    if (usageCount > 0) return fail(res, '该教材已被培养方案引用，无法删除');
    try {
      await prisma.textbook.delete({ where: { id: Number(id) } });
      success(res, null, '删除成功');
    } catch (e) {
      if (e.code === 'P2025') return fail(res, '教材不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
});

export default router;
