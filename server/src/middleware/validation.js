import { body, param, query, validationResult } from 'express-validator';
import { fail } from '../utils/response.js';

/**
 * 验证结果处理中间件
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return fail(res, firstError.msg || '请求参数验证失败', 422);
  }
  next();
}

/**
 * 班级创建/更新验证规则
 */
export const validateClass = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('班级名称不能为空且不超过100个字符'),
  body('enrollmentYear')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('入学年份必须在2000-2100之间'),
  body('durationYears')
    .isInt({ min: 1, max: 10 })
    .withMessage('学制必须在1-10年之间'),
  body('trainingLevelId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('培养层次ID必须为正整数'),
  body('majorId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('专业ID必须为正整数'),
  body('collegeId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('学院ID必须为正整数'),
  body('studentCount')
    .optional()
    .isInt({ min: 0, max: 999 })
    .withMessage('学生人数必须在0-999之间'),
  handleValidationErrors
];

/**
 * 用户登录验证规则
 */
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('用户名不能为空且不超过50个字符'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位'),
  handleValidationErrors
];

/**
 * 修改密码验证规则
 */
export const validateChangePassword = [
  body('oldPassword')
    .notEmpty()
    .withMessage('原密码不能为空'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('新密码长度必须在8-128位之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('密码必须包含大小写字母、数字和特殊字符'),
  handleValidationErrors
];

/**
 * 分页参数验证规则
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须为正整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  handleValidationErrors
];

/**
 * ID参数验证规则
 */
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须为正整数'),
  handleValidationErrors
];

/**
 * 专业验证规则
 */
export const validateMajor = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('专业名称不能为空且不超过100个字符'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('专业编码不超过50个字符'),
  handleValidationErrors
];

/**
 * 课程验证规则
 */
export const validateCourse = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('课程名称不能为空且不超过100个字符'),
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('课程编码不超过50个字符'),
  body('type')
    .optional()
    .isIn(['public', 'professional', 'elective'])
    .withMessage('课程类型必须是public、professional或elective'),
  handleValidationErrors
];

/**
 * 教材验证规则
 */
export const validateTextbook = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('书名不能为空且不超过200个字符'),
  body('isbn')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('ISBN不超过50个字符'),
  body('publisher')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('出版社不超过100个字符'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('作者不超过100个字符'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('定价必须为非负数'),
  handleValidationErrors
];
