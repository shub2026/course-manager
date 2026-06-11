import { Router } from 'express';
import { getAuditLogs } from '../services/audit.service.js';
import { success, fail } from '../utils/response.js';
import { validatePagination } from '../middleware/pagination.js';

const router = Router();

// GET /api/audit/logs - 查询操作日志
router.get('/logs', validatePagination(100), async (req, res, next) => {
  try {
    const { action, module, result, page, pageSize } = req.query;
    const logsData = await getAuditLogs({
      action,
      module,
      result,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
    success(res, logsData);
  } catch (e) {
    next(e);
  }
});

export default router;
