/**
 * 应用错误类
 * 用于统一错误处理
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // 标记为操作性错误（非编程错误）
  }
}

/**
 * 资源不存在错误
 */
export class NotFoundError extends AppError {
  constructor(resource = '资源') {
    super(`${resource}不存在`, 404, 'NOT_FOUND');
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message = '未授权，请先登录') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 权限错误
 */
export class AuthorizationError extends AppError {
  constructor(message = '权限不足，无法执行此操作') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 冲突错误
 */
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}
