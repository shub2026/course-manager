import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

const router = Router();

const DEFAULT_SETTINGS = {
  current_semester: { value: '2025-2026-2', description: '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）' },
};

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = { value: s.value, description: s.description };
    });
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map[key]) {
        const created = await prisma.systemSetting.create({
          data: { key, value: def.value, description: def.description },
        });
        map[key] = { value: created.value, description: created.description };
      }
    }
    success(res, map);
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: DEFAULT_SETTINGS[key]?.description || '' },
      });
    }
    success(res, null, '设置已更新');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/basic - 清空基础数据（全部）
router.post('/reset/basic', async (req, res, next) => {
  try {
    // 按依赖关系顺序清空基础数据
    await prisma.class.deleteMany();
    await prisma.textbook.deleteMany();
    await prisma.course.deleteMany();
    await prisma.major.deleteMany();
    await prisma.college.deleteMany();
    await prisma.trainingLevel.deleteMany();
    success(res, null, '基础数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/majors - 清空专业（检查班级依赖）
router.post('/reset/majors', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.class.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空专业');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.planTextbook.deleteMany();           // Level 2: 培养方案教材
    await prisma.planCourseSemester.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.planCourse.deleteMany();             // Level 2: 培养方案课程
    await prisma.trainingPlan.deleteMany();           // Level 1: 培养方案
    await prisma.major.deleteMany();                  // 清空专业
    success(res, null, '专业数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/colleges - 清空学院（检查班级依赖）
router.post('/reset/colleges', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.class.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空学院');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.planTextbook.deleteMany();           // Level 2: 培养方案教材
    await prisma.planCourseSemester.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.planCourse.deleteMany();             // Level 2: 培养方案课程
    await prisma.trainingPlan.deleteMany();           // Level 1: 培养方案
    await prisma.college.deleteMany();                // 清空学院
    success(res, null, '学院数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/levels - 清空层次（检查班级依赖）
router.post('/reset/levels', async (req, res, next) => {
  try {
    // 检查是否有班级存在
    const classCount = await prisma.class.count();
    if (classCount > 0) {
      return fail(res, '系统中存在班级数据，请先清空班级后再清空层次');
    }
    
    // 按依赖关系从顶向下清空
    await prisma.planTextbook.deleteMany();           // Level 2: 培养方案教材
    await prisma.planCourseSemester.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.planCourse.deleteMany();             // Level 2: 培养方案课程
    await prisma.trainingPlan.deleteMany();           // Level 1: 培养方案
    await prisma.trainingLevel.deleteMany();          // 清空层次
    success(res, null, '层次数据已清空（已级联清空相关的培养方案）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/courses - 清空课程（级联清空培养方案课程）
router.post('/reset/courses', async (req, res, next) => {
  try {
    // 先清空引用课程的培养方案课程
    await prisma.planTextbook.deleteMany();           // Level 2: 培养方案教材
    await prisma.planCourseSemester.deleteMany();     // Level 2: 培养方案课程学期
    await prisma.planCourse.deleteMany();             // Level 2: 培养方案课程（引用课程）
    await prisma.course.deleteMany();                 // 清空课程
    success(res, null, '课程数据已清空（已级联清空相关的培养方案课程）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/textbooks - 清空教材（级联清空培养方案教材）
router.post('/reset/textbooks', async (req, res, next) => {
  try {
    // 先清空引用教材的培养方案教材
    await prisma.planTextbook.deleteMany();           // Level 2: 培养方案教材（引用教材）
    await prisma.textbook.deleteMany();               // 清空教材
    success(res, null, '教材数据已清空（已级联清空相关的培养方案教材）');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/classes - 清空班级
router.post('/reset/classes', async (req, res, next) => {
  try {
    await prisma.class.deleteMany();
    success(res, null, '班级数据已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/plans - 清空培养方案
router.post('/reset/plans', async (req, res, next) => {
  try {
    // 按依赖关系顺序清空培养方案相关数据
    await prisma.planTextbook.deleteMany();
    await prisma.planCourseSemester.deleteMany();
    await prisma.planCourse.deleteMany();
    await prisma.trainingPlan.deleteMany();
    success(res, null, '培养方案已清空');
  } catch (e) { next(e); }
});

// POST /api/settings/reset/settings - 清空系统设置
router.post('/reset/settings', async (req, res, next) => {
  try {
    await prisma.systemSetting.deleteMany();
    success(res, null, '系统设置已清空');
  } catch (e) { next(e); }
});

export default router;
