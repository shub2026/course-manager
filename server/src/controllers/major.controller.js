import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { createAuditLog } from '../services/audit.service.js';
import { autoFixSortOrder } from '../utils/sort.js';

/**
 * 获取专业列表
 */
export async function listMajors(req, res, next) {
  try {
    await autoFixSortOrder('majors');
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
  } catch (e) {
    next(e);
  }
}

/**
 * 创建专业
 */
export async function createMajor(req, res, next) {
  try {
    const { name, code, description, sort_order } = req.body;
    if (!name) return fail(res, '专业名称不能为空');
    
    const maxSort = await prisma.majors.aggregate({ _max: { sort_order: true } });
    const newSortOrder = sort_order !== undefined ? Number(sort_order) : (maxSort._max.sort_order || 0) + 1;
    
    const major = await prisma.majors.create({ 
      data: { name, code, description, sort_order: newSortOrder } 
    });
    
    await createAuditLog({
      action: 'create',
      module: 'major',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: major.id, name, code },
      result: 'success',
      message: `创建专业：${name}`,
    });
    
    success(res, major, '创建成功');
  } catch (e) {
    await createAuditLog({
      action: 'create',
      module: 'major',
      userId: req.user?.id,
      ip: req.ip,
      details: req.body,
      result: 'failed',
      message: `创建专业失败：${e.message}`,
    });
    next(e);
  }
}

/**
 * 更新专业
 */
export async function updateMajor(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description, sort_order } = req.body;
    
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
      
      await createAuditLog({
        action: 'update',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: major.id, name, code },
        result: 'success',
        message: `更新专业：${name}`,
      });
      
      success(res, major, '更新成功');
    } catch (e) {
      await createAuditLog({
        action: 'update',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id, ...req.body },
        result: 'failed',
        message: `更新专业失败：${e.message}`,
      });
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) {
    next(e);
  }
}

/**
 * 删除专业
 */
export async function deleteMajor(req, res, next) {
  try {
    const { id } = req.params;
    const classCount = await prisma.classes.count({ where: { major_id: Number(id) } });
    if (classCount > 0) return fail(res, '该专业下存在班级，无法删除');
    
    try {
      const major = await prisma.majors.findUnique({ where: { id: Number(id) } });
      await prisma.majors.delete({ where: { id: Number(id) } });
      
      await createAuditLog({
        action: 'delete',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id), name: major?.name },
        result: 'success',
        message: `删除专业：${major?.name}`,
      });
      
      success(res, null, '删除成功');
    } catch (e) {
      await createAuditLog({
        action: 'delete',
        module: 'major',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: Number(id) },
        result: 'failed',
        message: `删除专业失败：${e.message}`,
      });
      if (e.code === 'P2025') return fail(res, '专业不存在', 404);
      throw e;
    }
  } catch (e) {
    next(e);
  }
}
