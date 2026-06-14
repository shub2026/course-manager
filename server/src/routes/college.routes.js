import { Router } from 'express';
import { roleMiddleware } from '../middleware/auth.middleware.js';
import { sanitizeBody } from '../middleware/xss.js';
import {
  listColleges,
  createCollege,
  updateCollege,
  deleteCollege,
} from '../controllers/college.controller.js';

const router = Router();

// GET - 所有登录用户可访问
router.get('/', listColleges);

// POST/PUT/DELETE - 需要admin权限
router.post('/', roleMiddleware('admin', 'super_admin'), sanitizeBody, createCollege);
router.put('/:id', roleMiddleware('admin', 'super_admin'), sanitizeBody, updateCollege);
router.delete('/:id', roleMiddleware('admin', 'super_admin'), deleteCollege);

export default router;
