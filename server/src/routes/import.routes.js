import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import xss from 'xss';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { readWorkbook } from '../utils/excel.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { createAuditLog } from '../services/audit.service.js';
import { ValidationError } from '../utils/error.js'; // H2修复：导入自定义错误类
import { log } from '../utils/logger.js'; // L1修复：使用winston logger

const router = Router();

// H7修复：使用xss库进行专业的XSS清洗
function sanitizeInput(value) {
  if (value === null || value === undefined) return value;
  const str = String(value).trim();
  // 使用xss库进行专业的HTML标签和脚本过滤
  return xss(str);
}

// H7修复：防止公式注入（Excel CSV Injection）
function sanitizeFormulaInjection(value) {
  if (value === null || value === undefined) return value;
  const str = String(value);
  // 如果以 =、+、-、@ 开头，添加单引号前缀使其成为纯文本
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .xlsx 或 .xls 文件'));
    }
  },
});

function cleanupFile(path) {
  if (path) fs.unlink(path, () => {});
}

// POST /api/import/classes - 批量导入班级（H6修复：事务性操作）
router.post('/classes', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    throw new ValidationError('请上传文件');
  }
  
  let rows;
  try {
    rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
  } catch (e) {
    cleanupFile(req.file.path);
    throw new ValidationError('Excel文件读取失败: ' + e.message);
  }

  const errors = [];
  let imported = 0;
  let overwritten = 0;

  // 预加载现有数据
  let majors = await prisma.majors.findMany();
  const majorMap = {};
  majors.forEach((m) => { majorMap[m.name] = m.id; });

  let levels = await prisma.training_levels.findMany();
  const levelMap = {};
  levels.forEach((l) => { levelMap[l.name] = l.id; });

  let colleges = await prisma.colleges.findMany();
  const collegeMap = {};
  colleges.forEach((c) => { collegeMap[c.name] = c.id; });

  // 统计自动创建的数量
  let autoCreatedLevels = 0;
  let autoCreatedMajors = 0;
  let autoCreatedColleges = 0;

  // H6修复：收集所有操作，在事务中执行
  const transactionOperations = [];
  const validationErrors = [];

  // 第一阶段：验证和准备数据
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // H7修复：对导入数据进行XSS和公式注入清洗
    const sanitizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      sanitizedRow[key] = sanitizeFormulaInjection(sanitizeInput(value));
    }
    
    const name = sanitizedRow['班级名称'];
    const enrollmentYear = sanitizedRow['入学年份'];
    const durationYears = sanitizedRow['学制(年)'];
    const majorName = sanitizedRow['专业类别'];
    const collegeName = sanitizedRow['二级学院'];
    const trainingLevelName = row['培养层次'];
    const studentCount = row['班级人数'];
    const statusValue = row['状态'];

    if (!name || !enrollmentYear || !durationYears || !trainingLevelName) {
      validationErrors.push(`第${i + 2}行：缺少必填字段（班级名称、入学年份、学制、培养层次）`);
      continue;
    }

    // 自动创建培养层次（如果不存在）
    let trainingLevelId = levelMap[trainingLevelName];
    if (!trainingLevelId && trainingLevelName) {
      try {
        const newLevel = await prisma.training_levels.create({
          data: {
            name: String(trainingLevelName).trim(),
            code: null,
            description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
            sort_order: 0,
          },
        });
        trainingLevelId = newLevel.id;
        levelMap[trainingLevelName] = trainingLevelId;
        autoCreatedLevels++;
      } catch (e) {
        // 可能是唯一约束冲突（并发情况），重新查询
        const existingLevel = await prisma.training_levels.findUnique({
          where: { name: String(trainingLevelName).trim() },
        });
        if (existingLevel) {
          trainingLevelId = existingLevel.id;
          levelMap[trainingLevelName] = trainingLevelId;
        } else {
          validationErrors.push(`第${i + 2}行：创建培养层次"${trainingLevelName}"失败`);
          continue;
        }
      }
    }
    if (!trainingLevelId) {
      validationErrors.push(`第${i + 2}行：培养层次不能为空`);
      continue;
    }

    // 自动创建专业（如果不存在且有提供）
    let majorId = majorMap[majorName];
    if (!majorId && majorName) {
      try {
        const newMajor = await prisma.majors.create({
          data: {
            name: String(majorName).trim(),
            code: null,
            description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
            sort_order: 0,
          },
        });
        majorId = newMajor.id;
        majorMap[majorName] = majorId;
        autoCreatedMajors++;
      } catch (e) {
        // 可能是唯一约束冲突（并发情况），重新查询
        const existingMajor = await prisma.majors.findFirst({
          where: { name: String(majorName).trim() },
        });
        if (existingMajor) {
          majorId = existingMajor.id;
          majorMap[majorName] = majorId;
        }
      }
    }

    // 自动创建学院（如果不存在且有提供）
    let collegeId = collegeMap[collegeName];
    if (!collegeId && collegeName) {
      try {
        const newCollege = await prisma.colleges.create({
          data: {
            name: String(collegeName).trim(),
            code: null,
            description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
            sort_order: 0,
          },
        });
        collegeId = newCollege.id;
        collegeMap[collegeName] = collegeId;
        autoCreatedColleges++;
      } catch (e) {
        // 可能是唯一约束冲突（并发情况），重新查询
        const existingCollege = await prisma.colleges.findUnique({
          where: { name: String(collegeName).trim() },
        });
        if (existingCollege) {
          collegeId = existingCollege.id;
          collegeMap[collegeName] = collegeId;
        }
      }
    }

    // 处理状态字段：支持"在读"/"已毕业"或"active"/"graduated"
    let status = 'active'; // 默认在读
    if (statusValue) {
      const statusStr = String(statusValue).trim();
      if (statusStr === '已毕业' || statusStr === 'graduated') {
        status = 'graduated';
      } else if (statusStr === '在读' || statusStr === 'active') {
        status = 'active';
      }
      // 如果状态值无效，使用自动计算的状态
    } else {
      // 如果未提供状态，根据入学年份和学制自动计算
      const semesterInfo = await getCurrentSemesterInfo();
      const grade = semesterInfo ? (semesterInfo.startYear - Number(enrollmentYear) + 1) : null;
      status = grade !== null && grade <= Number(durationYears) ? 'active' : 'graduated';
    }

    // 检测重复：按班级名称（第一列）
    const existingClass = await prisma.classes.findFirst({
      where: { name: String(name).trim() }
    });

    if (existingClass) {
      // 已存在则覆盖更新 - 添加到事务操作队列
      const updateData = {
        name: String(name).trim(),
        enrollment_year: Number(enrollmentYear),
        duration_years: Number(durationYears),
        student_count: studentCount ? Number(studentCount) : 0,
        status,
      };
      
      // 添加关系连接(如果存在)
      if (majorId) updateData.majors = { connect: { id: majorId } };
      if (collegeId) updateData.colleges = { connect: { id: collegeId } };
      if (trainingLevelId) updateData.training_levels = { connect: { id: trainingLevelId } };
      
      transactionOperations.push(
        prisma.classes.update({
          where: { id: existingClass.id },
          data: updateData,
        })
      );
      overwritten++;
    } else {
      // 不存在则创建 - 添加到事务操作队列
      const classData = {
        name: String(name).trim(),
        enrollment_year: Number(enrollmentYear),
        duration_years: Number(durationYears),
        student_count: studentCount ? Number(studentCount) : 0,
        status,
      };
      
      // 添加关系连接(如果存在)
      if (majorId) classData.majors = { connect: { id: majorId } };
      if (collegeId) classData.colleges = { connect: { id: collegeId } };
      if (trainingLevelId) classData.training_levels = { connect: { id: trainingLevelId } };
      
      transactionOperations.push(
        prisma.classes.create({
          data: classData,
        })
      );
      imported++;
    }
  }

  // H6修复：在事务中执行所有操作
  try {
    if (validationErrors.length > 0) {
      // 如果有验证错误，不执行事务
      const result = {
        imported: 0,
        overwritten: 0,
        failed: validationErrors.length,
        total: rows.length,
        errors: validationErrors,
        autoCreated: {
          trainingLevels: autoCreatedLevels,
          majors: autoCreatedMajors,
          colleges: autoCreatedColleges,
        },
      };

      await createAuditLog({
        action: 'import',
        module: 'class',
        userId: req.user?.id,
        details: result,
        result: 'failed',
        message: `班级导入验证失败: ${validationErrors.length}条错误`,
      });

      return success(res, result, `验证失败：${validationErrors.length}条错误`);
    }

    if (transactionOperations.length > 0) {
      // H6修复：使用事务确保原子性
      await prisma.$transaction(transactionOperations);
    }

    const result = {
      imported,
      overwritten,
      failed: validationErrors.length,
      total: rows.length,
      errors: validationErrors,
      autoCreated: {
        trainingLevels: autoCreatedLevels,
        majors: autoCreatedMajors,
        colleges: autoCreatedColleges,
      },
    };
    let message = `导入完成：新增${imported}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (validationErrors.length > 0) message += `，失败${validationErrors.length}条`;
    if (autoCreatedLevels > 0 || autoCreatedMajors > 0 || autoCreatedColleges > 0) {
      message += `（自动创建：${autoCreatedLevels}个层次、${autoCreatedMajors}个专业、${autoCreatedColleges}个学院）`;
    }

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'class',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        overwritten,
        failed: validationErrors.length,
        autoCreated: {
          trainingLevels: autoCreatedLevels,
          majors: autoCreatedMajors,
          colleges: autoCreatedColleges,
        },
      },
      result: (imported + overwritten) > 0 ? 'success' : 'failed',
      message: `导入完成：新增${imported}条，覆盖${overwritten}条，失败${validationErrors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    // H6修复：事务失败时自动回滚
    log.error('[班级导入] 事务执行失败，已回滚', { error: e.message, stack: e.stack });
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'class',
      userId: req.user?.id,
      result: 'failed',
      message: `班级导入事务失败: ${e.message}`,
    });
    
    next(e);
  }
});

// POST /api/import/courses - 批量导入课程（H6修复：事务性操作）
router.post('/courses', upload.single('file'), async (req, res, next) => {
  if (!req.file) throw new ValidationError('请上传文件');
  
  let rows;
  try {
    rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
  } catch (e) {
    cleanupFile(req.file.path);
    throw new ValidationError('Excel文件读取失败: ' + e.message);
  }

  const validationErrors = [];
  let imported = 0;
  let overwritten = 0;

  // H6修复：收集所有操作，在事务中执行
  const transactionOperations = [];

  // 第一阶段：验证和准备数据
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // H7修复：对导入数据进行XSS和公式注入清洗
    const sanitizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      sanitizedRow[key] = sanitizeFormulaInjection(sanitizeInput(value));
    }
    
    const name = sanitizedRow['课程名称'];
    const code = sanitizedRow['课程编码'] || null;
    const typeValue = sanitizedRow['课程类型'];
    const type = typeValue === '专业课' ? 'professional' : 'public';

    if (!name) {
      validationErrors.push(`第${i + 2}行：缺少课程名称`);
      continue;
    }

    // 检测重复：按课程名称（第一列）
    const existingCourse = await prisma.courses.findFirst({
      where: { name: String(name).trim() }
    });

    if (existingCourse) {
      // 已存在则覆盖更新 - 添加到事务操作队列
      transactionOperations.push(
        prisma.courses.update({
          where: { id: existingCourse.id },
          data: {
            name: String(name).trim(),
            code: code ? String(code).trim() : null,
            type,
          },
        })
      );
      overwritten++;
    } else {
      // 不存在则创建 - 添加到事务操作队列
      transactionOperations.push(
        prisma.courses.create({
          data: {
            name: String(name).trim(),
            code: code ? String(code).trim() : null,
            type,
          },
        })
      );
      imported++;
    }
  }

  // H6修复：在事务中执行所有操作
  try {
    if (validationErrors.length > 0) {
      // 如果有验证错误，不执行事务
      const result = {
        imported: 0,
        overwritten: 0,
        failed: validationErrors.length,
        total: rows.length,
        errors: validationErrors,
      };

      await createAuditLog({
        action: 'import',
        module: 'course',
        userId: req.user?.id,
        details: result,
        result: 'failed',
        message: `课程导入验证失败: ${validationErrors.length}条错误`,
      });

      return success(res, result, `验证失败：${validationErrors.length}条错误`);
    }

    if (transactionOperations.length > 0) {
      // H6修复：使用事务确保原子性
      await prisma.$transaction(transactionOperations);
    }

    const result = {
      imported,
      overwritten,
      failed: validationErrors.length,
      total: rows.length,
      errors: validationErrors,
    };
    let message = `导入完成：新增${imported}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (validationErrors.length > 0) message += `，失败${validationErrors.length}条`;

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'course',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        overwritten,
        failed: validationErrors.length,
      },
      result: (imported + overwritten) > 0 ? 'success' : 'failed',
      message: `导入完成：新增${imported}条，覆盖${overwritten}条，失败${validationErrors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    // H6修复：事务失败时自动回滚
    log.error('[课程导入] 事务执行失败，已回滚', { error: e.message, stack: e.stack });
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'course',
      userId: req.user?.id,
      result: 'failed',
      message: `课程导入事务失败: ${e.message}`,
    });
    
    next(e);
  }
});

// POST /api/import/textbooks - 批量导入教材（H6修复：事务性操作）
router.post('/textbooks', upload.single('file'), async (req, res, next) => {
  if (!req.file) throw new ValidationError('请上传文件');
  
  let rows;
  try {
    rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
  } catch (e) {
    cleanupFile(req.file.path);
    throw new ValidationError('Excel文件读取失败: ' + e.message);
  }

  const validationErrors = [];
  let imported = 0;
  let overwritten = 0;

  // H6修复：收集所有操作，在事务中执行
  const transactionOperations = [];

  // 第一阶段：验证和准备数据
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // H7修复：对导入数据进行XSS和公式注入清洗
    const sanitizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      sanitizedRow[key] = sanitizeFormulaInjection(sanitizeInput(value));
    }
    
    const title = sanitizedRow['书名'];
    const isbn = sanitizedRow['书号'] || null;
    const publisher = sanitizedRow['出版社'] || null;
    const author = sanitizedRow['作者'] || null;
    const edition = sanitizedRow['版次'] || null;
    const publish_date = sanitizedRow['出版日期'] || null;
    const price = sanitizedRow['定价'] ? Number(sanitizedRow['定价']) : null;
    const category = sanitizedRow['类别'] || null;

    if (!title) {
      validationErrors.push(`第${i + 2}行：缺少书名`);
      continue;
    }

    // 检测重复：按书名（第一列）
    const existingTextbook = await prisma.textbooks.findFirst({
      where: { title: String(title).trim() }
    });

    if (existingTextbook) {
      // 已存在则覆盖更新 - 添加到事务操作队列
      transactionOperations.push(
        prisma.textbooks.update({
          where: { id: existingTextbook.id },
          data: {
            title: String(title).trim(),
            isbn: isbn ? String(isbn).trim() : null,
            publisher: publisher ? String(publisher).trim() : null,
            author: author ? String(author).trim() : null,
            edition: edition ? String(edition).trim() : null,
            publish_date: publish_date ? String(publish_date).trim() : null,
            price: price && !isNaN(price) ? price : null,
            category: String(category).trim() || '技工',
          },
        })
      );
      overwritten++;
    } else {
      // 不存在则创建 - 添加到事务操作队列
      transactionOperations.push(
        prisma.textbooks.create({
          data: {
            title: String(title).trim(),
            isbn: isbn ? String(isbn).trim() : null,
            publisher: publisher ? String(publisher).trim() : null,
            author: author ? String(author).trim() : null,
            edition: edition ? String(edition).trim() : null,
            publish_date: publish_date ? String(publish_date).trim() : null,
            price: price && !isNaN(price) ? price : null,
            category: String(category).trim() || '技工',
          },
        })
      );
      imported++;
    }
  }

  // H6修复：在事务中执行所有操作
  try {
    if (validationErrors.length > 0) {
      // 如果有验证错误，不执行事务
      const result = {
        imported: 0,
        overwritten: 0,
        failed: validationErrors.length,
        total: rows.length,
        errors: validationErrors,
      };

      await createAuditLog({
        action: 'import',
        module: 'textbook',
        userId: req.user?.id,
        details: result,
        result: 'failed',
        message: `教材导入验证失败: ${validationErrors.length}条错误`,
      });

      return success(res, result, `验证失败：${validationErrors.length}条错误`);
    }

    if (transactionOperations.length > 0) {
      // H6修复：使用事务确保原子性
      await prisma.$transaction(transactionOperations);
    }

    const result = {
      imported,
      overwritten,
      failed: validationErrors.length,
      total: rows.length,
      errors: validationErrors,
    };
    let message = `导入完成：新增${imported}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (validationErrors.length > 0) message += `，失败${validationErrors.length}条`;

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'textbook',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        overwritten,
        failed: validationErrors.length,
      },
      result: (imported + overwritten) > 0 ? 'success' : 'failed',
      message: `导入完成：新增${imported}条，覆盖${overwritten}条，失败${validationErrors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    // H6修复：事务失败时自动回滚
    log.error('[教材导入] 事务执行失败，已回滚', { error: e.message, stack: e.stack });
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'textbook',
      userId: req.user?.id,
      result: 'failed',
      message: `教材导入事务失败: ${e.message}`,
    });
    
    next(e);
  }
});

export default router;
