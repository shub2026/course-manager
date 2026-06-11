import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

const DEFAULT_SETTINGS = {
  current_semester: { value: '2025-2026-2', description: '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）' },
  organization_name: { value: '欢迎回来', description: '系统标识（单位名称），用于首页展示' },
};

// GET - 公开访问（登录页需要读取系统标识）
router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.system_settings.findMany();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = { value: s.value, description: s.description };
    });
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map[key]) {
        const created = await prisma.system_settings.create({
          data: { key, value: def.value, description: def.description },
        });
        map[key] = { value: created.value, description: created.description };
      }
    }
    success(res, map);
  } catch (e) { next(e); }
});

// PUT - 需要登录且为super_admin权限
router.put('/', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.system_settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: DEFAULT_SETTINGS[key]?.description || '' },
      });
    }
    success(res, null, '设置已更新');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/basic - 清空基础数据（含培养方案）
router.post('/reset/basic', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // 按依赖关系顺序清空基础数据和培养方案
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
    success(res, null, '基础数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/majors - 清空专业（检查班级依赖）
router.post('/reset/majors', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空专业');
    }
    
    await prisma.$transaction(async (tx) => {
      // 按依赖关系从顶向下清空
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.majors.deleteMany();
    });
    success(res, null, '专业数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/colleges - 清空学院（检查班级依赖）
router.post('/reset/colleges', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空学院');
    }
    
    await prisma.$transaction(async (tx) => {
      // 按依赖关系从顶向下清空
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.colleges.deleteMany();
    });
    success(res, null, '学院数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/levels - 清空层次（检查班级依赖）
router.post('/reset/levels', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空层次');
    }
    
    await prisma.$transaction(async (tx) => {
      // 按依赖关系从顶向下清空
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
      await tx.training_levels.deleteMany();
    });
    success(res, null, '层次数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/courses - 清空课程（级联清空培养方案课程）
router.post('/reset/courses', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // 先清空引用课程的培养方案课程
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.courses.deleteMany();
    });
    success(res, null, '课程数据已清空（已级联清空相关的培养方案课程）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/textbooks - 清空教材（级联清空培养方案教材）
router.post('/reset/textbooks', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // 先清空引用教材的培养方案教材
      await tx.plan_textbooks.deleteMany();
      await tx.textbooks.deleteMany();
    });
    success(res, null, '教材数据已清空（已级联清空相关的培养方案教材）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/classes - 清空班级
router.post('/reset/classes', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.classes.deleteMany();
    success(res, null, '班级数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/plans - 清空培养方案
router.post('/reset/plans', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // 按依赖关系顺序清空培养方案相关数据
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      await tx.training_plans.deleteMany();
    });
    success(res, null, '培养方案已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/settings - 系统重置（清空所有业务数据，保留超级管理员）
router.post('/reset/settings', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      // 按依赖关系从顶向下清空所有业务数据
      
      // Level 3: 业务数据
      await tx.audit_logs.deleteMany();
      await tx.classes.deleteMany();
      
      // Level 2: 培养方案相关
      await tx.plan_textbooks.deleteMany();
      await tx.plan_course_semesters.deleteMany();
      await tx.plan_courses.deleteMany();
      
      // Level 1: 基础数据
      await tx.training_plans.deleteMany();
      await tx.textbooks.deleteMany();
      await tx.courses.deleteMany();
      await tx.majors.deleteMany();
      await tx.colleges.deleteMany();
      await tx.training_levels.deleteMany();
      
      // Level 0: 系统配置
      await tx.system_settings.deleteMany();
    });
    
    // 注意：不清空 users 表，保留所有用户账号（包括超级管理员）
    
    success(res, null, '系统已重置，所有业务数据已清空，用户账号已保留');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/audit-logs - 清空操作日志（需要super_admin权限）
router.post('/reset/audit-logs', authMiddleware, roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.audit_logs.deleteMany();
    success(res, null, '操作日志已清空');
  } catch (e) { next(e); }
});

export default router;
