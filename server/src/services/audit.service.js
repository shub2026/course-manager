import { prisma } from '../lib/prisma.js';

/**
 * 记录操作日志
 * @param {Object} params - 日志参数
 * @param {string} params.action - 操作类型：import, export, create, update, delete
 * @param {string} params.module - 模块名称：class, course, textbook, major, college, trainingPlan, system
 * @param {number} [params.userId] - 操作人ID
 * @param {string} [params.ip] - IP地址
 * @param {Object|string} [params.details] - 操作详情（对象或JSON字符串）
 * @param {string} params.result - 结果：success, failed
 * @param {string} [params.message] - 消息
 */
export async function createAuditLog({ action, module, userId, ip, details, result, message }) {
  try {
    await prisma.audit_logs.create({
      data: {
        action,
        module,
        operator_id: userId || null,
        ip: ip || null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        result,
        message: message || null,
      },
    });
  } catch (error) {
    console.error('创建审计日志失败:', error);
  }
}

/**
 * 查询操作日志
 * @param {Object} params - 查询参数
 * @param {string} [params.action] - 操作类型筛选
 * @param {string} [params.module] - 模块筛选
 * @param {string} [params.result] - 结果筛选
 * @param {number} [params.page] - 页码
 * @param {number} [params.pageSize] - 每页数量
 */
export async function getAuditLogs({ action, module, result, page = 1, pageSize = 20 }) {
  const where = {};
  if (action) where.action = action;
  if (module) where.module = module;
  if (result) where.result = result;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [logs, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.audit_logs.count({ where }),
  ]);

  // 将下划线命名转换为驼峰命名，保持前端一致
  const formattedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    module: log.module,
    userId: log.operator_id,
    ip: log.ip,
    details: log.details,
    result: log.result,
    message: log.message,
    createdAt: log.created_at,
  }));

  return { logs: formattedLogs, total, page, pageSize };
}
