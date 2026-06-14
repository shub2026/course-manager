import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { createAuditLog } from '../services/audit.service.js';
import { autoFixSortOrder } from '../utils/sort.js';

export async function listColleges(req, res, next) {
  try {
    await autoFixSortOrder('colleges');
    const colleges = await prisma.colleges.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { sort_order: 'asc' },
    });
    
    const formattedColleges = colleges.map(college => ({
      ...college,
      classCount: college._count?.classes || 0,
    }));
    success(res, formattedColleges);
  } catch (e) { next(e); }
}

export async function createCollege(req, res, next) {
  try {
    const { name, code, description, sort_order } = req.body;
    if (!name) return fail(res, '学院名称不能为空');
    const maxSort = await prisma.colleges.aggregate({ _max: { sort_order: true } });
    const newSortOrder = sort_order !== undefined ? Number(sort_order) : (maxSort._max.sort_order || 0) + 1;
    const college = await prisma.colleges.create({
      data: { name, code, description, sort_order: newSortOrder },
    });
    
    await createAuditLog({
      action: 'create',
      module: 'college',
      userId: req.user?.id,
      ip: req.ip,
      details: { id: college.id, name, code },
      result: 'success',
      message: `创建学院：${name}`,
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
      message: `创建学院失败：${e.message}`,
    });
    if (e.code === 'P2002') return fail(res, '该学院名称已存在');
    next(e);
  }
}

export async function updateCollege(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description, sort_order } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (description !== undefined) data.description = description;
    if (sort_order !== undefined) data.sort_order = Number(sort_order);
    try {
      const college = await prisma.colleges.update({ where: { id: Number(id) }, data });
      
      await createAuditLog({
        action: 'update',
        module: 'college',
        userId: req.user?.id,
        ip: req.ip,
        details: { id: college.id, name, code },
        result: 'success',
        message: `更新学院：${name}`,
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
        message: `更新学院失败：${e.message}`,
      });
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      if (e.code === 'P2002') return fail(res, '该学院名称已存在');
      throw e;
    }
  } catch (e) { next(e); }
}

export async function deleteCollege(req, res, next) {
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
        message: `删除学院：${college?.name}`,
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
        message: `删除学院失败：${e.message}`,
      });
      if (e.code === 'P2025') return fail(res, '学院不存在', 404);
      throw e;
    }
  } catch (e) { next(e); }
}
