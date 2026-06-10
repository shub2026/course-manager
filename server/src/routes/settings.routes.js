import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { roleMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

const DEFAULT_SETTINGS = {
  current_semester: { value: '2025-2026-2', description: '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）' },
};

// GET - 所有登录用户可访问
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

// PUT - 需要super_admin权限
router.put('/', roleMiddleware('super_admin'), async (req, res, next) => {
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

// POST /api/settings/reset/* - 需要super_admin权限
router.post('/reset/basic', roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 按依赖关系顺序清空基础数据
    await prisma.classes.deleteMany();
    await prisma.textbooks.deleteMany();
    await prisma.courses.deleteMany();
    await prisma.majors.deleteMany();
    await prisma.colleges.deleteMany();
    await prisma.training_levels.deleteMany();
    success(res, null, '基础数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/majors - 清空专业（检查班级依赖）
router.post('/reset/majors', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空专业');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.plan_textbooks.deleteMany();           // Level 2: 培养方案教材
    await prisma.plan_course_semesters.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.plan_courses.deleteMany();             // Level 2: 培养方案课程
    await prisma.training_plans.deleteMany();           // Level 1: 培养方案
    await prisma.majors.deleteMany();                  // 清空专业
    success(res, null, '专业数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/colleges - 清空学院（检查班级依赖）
router.post('/reset/colleges', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空学院');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.plan_textbooks.deleteMany();           // Level 2: 培养方案教材
    await prisma.plan_course_semesters.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.plan_courses.deleteMany();             // Level 2: 培养方案课程
    await prisma.training_plans.deleteMany();           // Level 1: 培养方案
    await prisma.colleges.deleteMany();                // 清空学院
    success(res, null, '学院数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/levels - 清空层次（检查班级依赖）
router.post('/reset/levels', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.classes.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空层次');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.plan_textbooks.deleteMany();           // Level 2: 培养方案教材
    await prisma.plan_course_semesters.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.plan_courses.deleteMany();             // Level 2: 培养方案课程
    await prisma.training_plans.deleteMany();           // Level 1: 培养方案
    await prisma.training_levels.deleteMany();          // 清空层次
    success(res, null, '层次数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/courses - 清空课程（级联清空培养方案课程）
router.post('/reset/courses', async (req, res, next) => {
  try {
    // 先清空引用课程的培养方案课程
    await prisma.plan_textbooks.deleteMany();           // Level 2: 培养方案教材
    await prisma.plan_course_semesters.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.plan_courses.deleteMany();             // Level 2: 培养方案课程（引用课程）
    await prisma.courses.deleteMany();                 // 清空课程
    success(res, null, '课程数据已清空（已级联清空相关的培养方案课程）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/textbooks - 清空教材（级联清空培养方案教材）
router.post('/reset/textbooks', async (req, res, next) => {
  try {
    // 先清空引用教材的培养方案教材
    await prisma.plan_textbooks.deleteMany();           // Level 2: 培养方案教材（引用教材）
    await prisma.textbooks.deleteMany();               // 清空教材
    success(res, null, '教材数据已清空（已级联清空相关的培养方案教材）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/classes - 清空班级
router.post('/reset/classes', async (req, res, next) => {
  try {
    await prisma.classes.deleteMany();
    success(res, null, '班级数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/plans - 清空培养方案
router.post('/reset/plans', async (req, res, next) => {
  try {
    // 按依赖关系顺序清空培养方案相关数据
    await prisma.plan_textbooks.deleteMany();
    await prisma.plan_course_semesters.deleteMany();
    await prisma.plan_courses.deleteMany();
    await prisma.training_plans.deleteMany();
    success(res, null, '培养方案已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/settings - 系统重置（清空所有业务数据，保留超级管理员）
router.post('/reset/settings', roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    // 按依赖关系从顶向下清空所有业务数据
    
    // Level 3: 业务数据
    await prisma.audit_logs.deleteMany();           // 操作日志
    await prisma.classes.deleteMany();              // 班级
    
    // Level 2: 培养方案相关
    await prisma.plan_textbooks.deleteMany();       // 培养方案教材关联
    await prisma.plan_course_semesters.deleteMany(); // 培养方案课程学期
    await prisma.plan_courses.deleteMany();         // 培养方案课程
    
    // Level 1: 基础数据
    await prisma.training_plans.deleteMany();       // 培养方案
    await prisma.textbooks.deleteMany();            // 教材
    await prisma.courses.deleteMany();              // 课程
    await prisma.majors.deleteMany();               // 专业
    await prisma.colleges.deleteMany();             // 学院
    await prisma.training_levels.deleteMany();      // 培养层次
    
    // Level 0: 系统配置
    await prisma.system_settings.deleteMany();      // 系统设置
    
    // 注意：不清空 users 表，保留所有用户账号（包括超级管理员）
    
    success(res, null, '系统已重置，所有业务数据已清空，用户账号已保留');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/audit-logs - 清空操作日志（需要super_admin权限）
router.post('/reset/audit-logs', roleMiddleware('super_admin'), async (req, res, next) => {
  try {
    await prisma.audit_logs.deleteMany();
    success(res, null, '操作日志已清空');
  } catch (e) { next(e); }
});

export default router;
