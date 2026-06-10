import { createAuditLog } from '../services/audit.service.js';

/**
 * 审计日志中间件
 * 自动记录操作的审计日志
 * 
 * @param {string} action - 操作类型：create, update, delete, import, export
 * @param {string} module - 模块名称
 * @param {Function} getMessage - 生成消息的函数 (req, result) => string
 */
export function auditLog(action, module, getMessage) {
  return async (req, res, next) => {
    // 保存原始的res.json方法
    const originalJson = res.json;

    // 重写res.json方法以捕获响应数据
    res.json = function(data) {
      // 异步记录审计日志（不阻塞响应）
      Promise.resolve().then(async () => {
        try {
          const userId = req.user?.id;
          const ip = req.ip;
          
          // 根据响应结果确定操作是否成功
          const result = data?.success ? 'success' : 'failed';
          
          // 生成消息
          const message = typeof getMessage === 'function' 
            ? getMessage(req, data)
            : `${action} ${module}`;

          await createAuditLog({
            action,
            module,
            userId,
            ip,
            details: data?.data || req.body,
            result,
            message
          });
        } catch (error) {
          console.error('审计日志记录失败:', error);
        }
      }).catch(err => {
        console.error('审计日志记录异常:', err);
      });

      // 调用原始的res.json方法
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * 简化的审计日志中间件（使用默认消息）
 */
export function auditLogSimple(action, module) {
  return auditLog(action, module, (req, data) => {
    const resourceName = req.body?.name || req.params?.id || module;
    return `${action === 'create' ? '创建' : action === 'update' ? '更新' : action === 'delete' ? '删除' : ''}${module}：${resourceName}`;
  });
}
