import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';
import { sanitizeBody } from '../middleware/xss.js';
import {
  getSettings,
  updateSettings,
  initializeSettings,
  resetBasic,
  resetMajors,
  resetColleges,
  resetLevels,
  resetCourses,
  resetTextbooks,
  resetClasses,
  resetPlans,
  resetSystem,
  resetAuditLogs,
} from '../controllers/settings.controller.js';

const router = Router();

// GET - 公开访问（登录页需要读取系统标识）
router.get('/', getSettings);

// PUT - 需要登录且为super_admin权限
router.put('/', authMiddleware, roleMiddleware('super_admin'), sanitizeBody, updateSettings);

// POST /api/settings/initialize - 初始化接口
router.post('/initialize', authMiddleware, roleMiddleware('super_admin'), initializeSettings);

// 重置接口 - 需要super_admin权限
router.post('/reset/basic', authMiddleware, roleMiddleware('super_admin'), resetBasic);
router.post('/reset/majors', authMiddleware, roleMiddleware('super_admin'), resetMajors);
router.post('/reset/colleges', authMiddleware, roleMiddleware('super_admin'), resetColleges);
router.post('/reset/levels', authMiddleware, roleMiddleware('super_admin'), resetLevels);
router.post('/reset/courses', authMiddleware, roleMiddleware('super_admin'), resetCourses);
router.post('/reset/textbooks', authMiddleware, roleMiddleware('super_admin'), resetTextbooks);
router.post('/reset/classes', authMiddleware, roleMiddleware('super_admin'), resetClasses);
router.post('/reset/plans', authMiddleware, roleMiddleware('super_admin'), resetPlans);
router.post('/reset/settings', authMiddleware, roleMiddleware('super_admin'), resetSystem);
router.post('/reset/audit-logs', authMiddleware, roleMiddleware('super_admin'), resetAuditLogs);

export default router;
