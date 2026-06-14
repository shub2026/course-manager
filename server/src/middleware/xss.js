import xss from 'xss';

/**
 * XSS防护中间件
 * 对请求体中的字符串数据进行XSS清洗
 */
export function sanitizeBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  // 递归清洗对象中的所有字符串值
  req.body = sanitizeObject(req.body);
  next();
}

/**
 * 递归清洗对象中的字符串值
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return xss(obj.trim());
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * 查询参数XSS清洗中间件
 */
export function sanitizeQuery(req, res, next) {
  if (!req.query || typeof req.query !== 'object') {
    return next();
  }

  req.query = sanitizeObject(req.query);
  next();
}
