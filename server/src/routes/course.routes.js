import { Router } from 'express';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { sanitizeBody } from '../middleware/xss.js';
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/course.controller.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', listCourses);

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), sanitizeBody, createCourse);
router.put('/:id', roleMiddleware('admin', 'super_admin'), sanitizeBody, updateCourse);
router.delete('/:id', roleMiddleware('admin', 'super_admin'), deleteCourse);

export default router;
