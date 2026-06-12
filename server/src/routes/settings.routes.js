import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();

const DEFAULT_SETTINGS = {
  current_semester: { value: '2025-2026-2', description: '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）' },
  organization_name: { value: '欢迎回来', description: '系统标识（单位名称），用于首页展示' },
};

// GET - 公开访问（登录页需要读取系统标识）
// M11修复：移除GET请求中的写操作，符合RESTful规范
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.system_settings.findMany();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = { value: s.value, description: s.description };
    });
    
    // M11修复：仅返回现有设置，不再自动创建缺失项
    // 如需初始化默认设置，请使用 POST /api/settings/initialize 接口
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map[key]) {
        // 仅返回默认值，不写入数据库
        map[key] = { value: def.value, description: def.description, isDefault: true };
      }
    }
    
    success(res, map);
  } catch (e) { next(e); }
});

// PUT - 需要登录且为super_admin权限
router.put('/', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const updates = req.body;
    
    // H5修复：添加Key白名单验证
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);
    const invalidKeys = Object.keys(updates).filter(key => !allowedKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return fail(res, `不允许的设置项: ${invalidKeys.join(', ')}`, 400);
    }
    
    for (const [key, value] of Object.entries(updates)) {
      await prisma.system_settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: DEFAULT_SETTINGS[key]?.description || '' },
      });
    }
    await createAuditLog({
      action: 'update',
      module: 'system',
      userId: req.user?.id,
      ip: req.ip,
      details: { keys: Object.keys(updates) },
      result: 'success',
      message: `更新系统设置：${Object.keys(updates).join(', ')}`,
    });
    success(res, null, '设置已更新');
  } catch (e) {
    await createAuditLog({
      action: 'update',
      module: 'system',
      userId: req.user?.id,
      ip: req.ip,
      details: { keys: Object.keys(req.body) },
      result: 'failed',
      message: `更新系统设置失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/initialize - M11修复：专门的初始化接口（替代GET中的写操作）
router.post('/initialize', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const initialized = [];
    
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await prisma.system_settings.findUnique({ where: { key } });
      if (!existing) {
        await prisma.system_settings.create({
          data: { key, value: def.value, description: def.description },
        });
        initialized.push(key);
      }
    }
    
    await createAuditLog({
      action: 'initialize',
      module: 'system',
      userId: req.user?.id,
      ip: req.ip,
      details: { initializedKeys: initialized },
      result: 'success',
      message: `初始化系统设置：${initialized.join(', ') || '无新增'}`,
    });
    
    success(res, { initialized }, initialized.length > 0 ? `已初始化 ${initialized.length} 项设置` : '所有设置已存在');
  } catch (e) {
    await createAuditLog({
      action: 'initialize',
      module: 'system',
      userId: req.user?.id,
      ip: req.ip,
      result: 'failed',
      message: `初始化系统设置失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/basic - 清空基础数据（含培养方案）
router.post('/reset/basic', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.classes.deleteMany();
      await tx.textbooks.deleteMany();
      await tx.courses.deleteMany();
      await tx.majors.deleteMany();
      await tx.colleges.deleteMany();
      await tx.training_levels.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_basic' }, result: 'success', message: '清空基础数据',
    });
    success(res, null, '基础数据已清空');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_basic' }, result: 'failed', message: `清空基础数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/majors - 清空专业（检查班级依赖）
router.post('/reset/majors', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空专业');
    }
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.majors.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_majors' }, result: 'success', message: '清空专业数据',
    });
    success(res, null, '专业数据已清空（已级联清空相关的培养方案）');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_majors' }, result: 'failed', message: `清空专业数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/colleges - 清空学院（检查班级依赖）
router.post('/reset/colleges', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空学院');
    }
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.colleges.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_colleges' }, result: 'success', message: '清空学院数据',
    });
    success(res, null, '学院数据已清空（已级联清空相关的培养方案）');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_colleges' }, result: 'failed', message: `清空学院数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/levels - 清空层次（检查班级依赖）
router.post('/reset/levels', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空层次');
    }
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.training_levels.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_levels' }, result: 'success', message: '清空培养层次数据',
    });
    success(res, null, '层次数据已清空（已级联清空相关的培养方案）');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_levels' }, result: 'failed', message: `清空培养层次数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/courses - 清空课程（级联清空培养方案课程）
router.post('/reset/courses', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.courses.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_courses' }, result: 'success', message: '清空课程数据',
    });
    success(res, null, '课程数据已清空（已级联清空相关的培养方案课程）');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_courses' }, result: 'failed', message: `清空课程数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/textbooks - 清空教材（级联清空培养方案教材）
router.post('/reset/textbooks', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.textbooks.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_textbooks' }, result: 'success', message: '清空教材数据',
    });
    success(res, null, '教材数据已清空（已级联清空相关的培养方案教材）');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_textbooks' }, result: 'failed', message: `清空教材数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/classes - 清空班级
router.post('/reset/classes', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.classes.deleteMany();
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_classes' }, result: 'success', message: '清空班级数据',
    });
    success(res, null, '班级数据已清空');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_classes' }, result: 'failed', message: `清空班级数据失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/plans - 清空培养方案
router.post('/reset/plans', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
    });
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_plans' }, result: 'success', message: '清空培养方案',
    });
    success(res, null, '培养方案已清空');
  } catch (e) {
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_plans' }, result: 'failed', message: `清空培养方案失败: ${e.message}`,
    });
    next(e);
  }
});

// POST /api/settings/reset/settings - 系统重置（清空所有业务数据，保留超级管理员）
router.post('/reset/settings', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 系统重置前记录审计日志（因为重置会清空日志表）
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'system_reset' }, result: 'success', message: '执行系统重置',
    });
    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.deleteMany();
      await tx.classes.deleteMany();
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.textbooks.deleteMany();
      await tx.courses.deleteMany();
      await tx.majors.deleteMany();
      await tx.colleges.deleteMany();
      await tx.training_levels.deleteMany();
      await tx.system_settings.deleteMany();
    });
    success(res, null, '系统已重置，所有业务数据已清空，用户账号已保留');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/audit-logs - 清空操作日志（需要super_admin权限）
router.post('/reset/audit-logs', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 先记录日志再清空（否则这条记录也会被清空）
    await createAuditLog({
      action: 'delete', module: 'system', userId: req.user?.id, ip: req.ip,
      details: { type: 'reset_audit_logs' }, result: 'success', message: '清空操作日志',
    });
    await prisma.audit_logs.deleteMany();
    success(res, null, '操作日志已清空');
  } catch (e) { next(e); }
});

export default router;
