/**
 * 排序自动修复工具
 *
 * 当检测到所有记录的 sort_order 都为 0（或大量重复）时，
 * 自动按当前列表顺序分配递增的排序值。
 */
import { prisma } from '../lib/prisma.js';

/**
 * 检查并自动修复重复的 sort_order 值
 * @param {string} modelName - Prisma 模型名称（如 'majors', 'courses'）
 * @param {object} [where={}] - 可选的过滤条件
 * @returns {Promise<boolean>} 是否执行了修复
 */
export async function autoFixSortOrder(modelName, where = {}) {
  try {
    const items = await prisma[modelName].findMany({
      where,
      select: { id: true, sort_order: true },
      orderBy: { id: 'asc' },
    });

    if (!items || items.length <= 1) return false;

    // 检查是否存在 sort_order 重复（所有值都是 0，或超过一半的值重复）
    const sortValues = items.map(i => i.sort_order);
    const uniqueValues = new Set(sortValues);

    // 如果所有值都相同（特别是都为 0），或者超过 50% 的值重复，则需要修复
    const needsFix = uniqueValues.size === 1 || uniqueValues.size < items.length * 0.5;

    if (!needsFix) return false;

    // 按当前顺序分配递增的 sort_order
    const updates = items.map((item, index) =>
      prisma[modelName].update({
        where: { id: item.id },
        data: { sort_order: index + 1 },
      })
    );

    await prisma.$transaction(updates);
    return true;
  } catch (e) {
    console.error(`自动修复 ${modelName} 排序失败:`, e.message);
    return false;
  }
}
