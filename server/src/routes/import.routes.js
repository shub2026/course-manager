import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { readWorkbook } from '../utils/excel.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';
import { createAuditLog } from '../services/audit.service.js';

const router = Router();
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

// POST /api/import/classes - 批量导入班级
router.post('/classes', (req, res, next) => {
  console.log('[班级导入] 中间件进入:', {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    authorization: req.headers['authorization'] ? 'present' : 'missing'
  });
  next();
}, upload.single('file'), async (req, res, next) => {
  console.log('[班级导入] 请求收到:', {
    hasFile: !!req.file,
    file: req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : null,
    onDuplicate: req.body.onDuplicate,
    user: req.user ? { id: req.user.id, username: req.user.username, role: req.user.role } : null
  });
  
  try {
    if (!req.file) {
      console.error('[班级导入] 错误: 没有接收到文件');
      return fail(res, '请上传文件');
    }
    
    const onDuplicate = req.body.onDuplicate || 'skip'; // 'skip' | 'overwrite'
    console.log('[班级导入] 开始读取Excel文件:', req.file.path);
    const rows = await readWorkbook(req.file.path);
    console.log('[班级导入] Excel读取完成,行数:', rows.length, '前3行示例:', rows.slice(0, 3));
    console.log('[班级导入] Excel读取完成,行数:', rows.length);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;
    let skipped = 0;
    let overwritten = 0;

    console.log('[班级导入] 读取到', rows.length, '行数据, onDuplicate:', onDuplicate);

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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['班级名称'];
      const enrollmentYear = row['入学年份'];
      const durationYears = row['学制(年)'];
      const majorName = row['专业类别'];
      const collegeName = row['二级学院'];
      const trainingLevelName = row['培养层次'];
      const studentCount = row['班级人数'];
      const statusValue = row['状态'];

      console.log(`[班级导入] 第${i + 2}行原始数据:`, JSON.stringify(row));
      console.log(`[班级导入] 第${i + 2}行解析结果:`, { 
        name, 
        enrollmentYear: `[${typeof enrollmentYear}]${enrollmentYear}`, 
        durationYears: `[${typeof durationYears}]${durationYears}`, 
        majorName, 
        collegeName, 
        trainingLevelName, 
        studentCount: `[${typeof studentCount}]${studentCount}`, 
        statusValue 
      });

      if (!name || !enrollmentYear || !durationYears || !trainingLevelName) {
        errors.push(`第${i + 2}行：缺少必填字段（班级名称、入学年份、学制、培养层次）`);
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
          console.log(`[班级导入] 自动创建培养层次: "${trainingLevelName}" (ID: ${trainingLevelId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingLevel = await prisma.training_levels.findUnique({
            where: { name: String(trainingLevelName).trim() },
          });
          if (existingLevel) {
            trainingLevelId = existingLevel.id;
            levelMap[trainingLevelName] = trainingLevelId;
          } else {
            errors.push(`第${i + 2}行：创建培养层次"${trainingLevelName}"失败`);
            continue;
          }
        }
      }
      if (!trainingLevelId) {
        errors.push(`第${i + 2}行：培养层次不能为空`);
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
          console.log(`[班级导入] 自动创建专业: "${majorName}" (ID: ${majorId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingMajor = await prisma.majors.findFirst({
            where: { name: String(majorName).trim() },
          });
          if (existingMajor) {
            majorId = existingMajor.id;
            majorMap[majorName] = majorId;
          } else {
            console.warn(`[班级导入] 第${i + 2}行：创建专业"${majorName}"失败，将忽略`);
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
          console.log(`[班级导入] 自动创建学院: "${collegeName}" (ID: ${collegeId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingCollege = await prisma.colleges.findUnique({
            where: { name: String(collegeName).trim() },
          });
          if (existingCollege) {
            collegeId = existingCollege.id;
            collegeMap[collegeName] = collegeId;
          } else {
            console.warn(`[班级导入] 第${i + 2}行：创建学院"${collegeName}"失败，将忽略`);
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

      try {
        // 检测重复：按班级名称
        const existingClass = await prisma.classes.findFirst({
          where: { name: String(name).trim() }
        });

        if (existingClass) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[班级导入] 第${i + 2}行: 跳过重复数据 "${name}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
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
            
            await prisma.classes.update({
              where: { id: existingClass.id },
              data: updateData,
            });
            overwritten++;
            console.log(`[班级导入] 第${i + 2}行: 覆盖更新 "${name}"`);
            continue;
          }
        }

        // 不存在则创建
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
        
        await prisma.classes.create({
          data: classData,
        });
        imported++;
        console.log(`[班级导入] 第${i + 2}行: 导入成功`);
      } catch (e) {
        const errorMsg = e.message || '未知错误';
        errors.push(`第${i + 2}行：${errorMsg}`);
        console.error(`[班级导入] 第${i + 2}行: 导入失败 -`, errorMsg);
      }
    }

    const result = {
      imported,
      skipped,
      overwritten,
      failed: errors.length,
      total: rows.length,
      errors,
      autoCreated: {
        trainingLevels: autoCreatedLevels,
        majors: autoCreatedMajors,
        colleges: autoCreatedColleges,
      },
    };
    let message = `导入完成：新增${imported}条`;
    if (skipped > 0) message += `，跳过${skipped}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (errors.length > 0) message += `，失败${errors.length}条`;
    if (autoCreatedLevels > 0 || autoCreatedMajors > 0 || autoCreatedColleges > 0) {
      message += `（自动创建：${autoCreatedLevels}个层次、${autoCreatedMajors}个专业、${autoCreatedColleges}个学院）`;
    }

    console.log('[班级导入] 结果:', result);

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'class',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        skipped,
        overwritten,
        failed: errors.length,
        autoCreated: {
          trainingLevels: autoCreatedLevels,
          majors: autoCreatedMajors,
          colleges: autoCreatedColleges,
        },
      },
      result: errors.length > 0 ? 'failed' : 'success',
      message: `导入完成：新增${imported}条，跳过${skipped}条，覆盖${overwritten}条，失败${errors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    console.error('[班级导入] 异常错误:', e);
    if (req.file) cleanupFile(req.file.path);
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'class',
      userId: req.user?.id,
      result: 'failed',
      message: `班级导入失败: ${e.message}`,
    });
    
    next(e);
  }
});

// POST /api/import/courses - 批量导入课程
router.post('/courses', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, '请上传文件');
    
    const onDuplicate = req.body.onDuplicate || 'skip'; // 'skip' | 'overwrite'
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;
    let skipped = 0;
    let overwritten = 0;

    console.log('[课程导入] 读取到', rows.length, '行数据, onDuplicate:', onDuplicate);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['课程名称'];
      const code = row['课程编码'] || null;
      const typeValue = row['课程类型'];
      const type = typeValue === '专业课' ? 'professional' : 'public';

      console.log(`[课程导入] 第${i + 2}行:`, { name, code, type, typeValue });

      if (!name) {
        errors.push(`第${i + 2}行：缺少课程名称`);
        continue;
      }

      try {
        // 检测重复：按课程名称
        const existingCourse = await prisma.courses.findFirst({
          where: { name: String(name).trim() }
        });

        if (existingCourse) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[课程导入] 第${i + 2}行: 跳过重复数据 "${name}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
            await prisma.courses.update({
              where: { id: existingCourse.id },
              data: {
                name: String(name).trim(),
                code: code ? String(code).trim() : null,
                type,
              },
            });
            overwritten++;
            console.log(`[课程导入] 第${i + 2}行: 覆盖更新 "${name}"`);
            continue;
          }
        }

        // 不存在则创建
        await prisma.courses.create({
          data: {
            name: String(name).trim(),
            code: code ? String(code).trim() : null,
            type,
          },
        });
        imported++;
        console.log(`[课程导入] 第${i + 2}行: 导入成功`);
      } catch (e) {
        const errorMsg = e.message || '未知错误';
        errors.push(`第${i + 2}行：${errorMsg}`);
        console.error(`[课程导入] 第${i + 2}行: 导入失败 -`, errorMsg);
      }
    }

    const result = {
      imported,
      skipped,
      overwritten,
      failed: errors.length,
      total: rows.length,
      errors,
    };
    let message = `导入完成：新增${imported}条`;
    if (skipped > 0) message += `，跳过${skipped}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (errors.length > 0) message += `，失败${errors.length}条`;

    console.log('[课程导入] 结果:', result);

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'course',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        skipped,
        overwritten,
        failed: errors.length,
      },
      result: errors.length > 0 ? 'failed' : 'success',
      message: `导入完成：新增${imported}条，跳过${skipped}条，覆盖${overwritten}条，失败${errors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'course',
      userId: req.user?.id,
      result: 'failed',
      message: `课程导入失败: ${e.message}`,
    });
    
    next(e);
  }
});

// POST /api/import/textbooks - 批量导入教材
router.post('/textbooks', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, '请上传文件');
    
    const onDuplicate = req.body.onDuplicate || 'skip'; // 'skip' | 'overwrite'
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;
    let skipped = 0;
    let overwritten = 0;

    console.log('[教材导入] 读取到', rows.length, '行数据, onDuplicate:', onDuplicate);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const title = row['书名'];
      const isbn = row['书号'] || null;
      const publisher = row['出版社'] || null;
      const author = row['作者'] || null;
      const edition = row['版次'] || null;
      const price = row['定价'] ? Number(row['定价']) : null;
      const category = row['类别'] || null;

      console.log(`[教材导入] 第${i + 2}行:`, { title, isbn, publisher, author, edition, price, category });

      if (!title) {
        errors.push(`第${i + 2}行：缺少书名`);
        continue;
      }

      try {
        // 检测重复：按书名+书号（如果书号存在）
        let existingTextbook = null;
        if (isbn) {
          existingTextbook = await prisma.textbooks.findFirst({
            where: { OR: [{ title: String(title).trim() }, { isbn: String(isbn).trim() }] }
          });
        } else {
          existingTextbook = await prisma.textbooks.findFirst({
            where: { title: String(title).trim() }
          });
        }

        if (existingTextbook) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[教材导入] 第${i + 2}行: 跳过重复数据 "${title}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
            await prisma.textbooks.update({
              where: { id: existingTextbook.id },
              data: {
                title: String(title).trim(),
                isbn: isbn ? String(isbn).trim() : null,
                publisher: publisher ? String(publisher).trim() : null,
                author: author ? String(author).trim() : null,
                edition: edition ? String(edition).trim() : null,
                price: price && !isNaN(price) ? price : null,
                category: String(category).trim() || '技工',
              },
            });
            overwritten++;
            console.log(`[教材导入] 第${i + 2}行: 覆盖更新 "${title}"`);
            continue;
          }
        }

        // 不存在则创建
        await prisma.textbooks.create({
          data: {
            title: String(title).trim(),
            isbn: isbn ? String(isbn).trim() : null,
            publisher: publisher ? String(publisher).trim() : null,
            author: author ? String(author).trim() : null,
            edition: edition ? String(edition).trim() : null,
            price: price && !isNaN(price) ? price : null,
            category: String(category).trim() || '技工',
          },
        });
        imported++;
        console.log(`[教材导入] 第${i + 2}行: 导入成功`);
      } catch (e) {
        const errorMsg = e.message || '未知错误';
        errors.push(`第${i + 2}行：${errorMsg}`);
        console.error(`[教材导入] 第${i + 2}行: 导入失败 -`, errorMsg);
      }
    }

    const result = {
      imported,
      skipped,
      overwritten,
      failed: errors.length,
      total: rows.length,
      errors,
    };
    let message = `导入完成：新增${imported}条`;
    if (skipped > 0) message += `，跳过${skipped}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (errors.length > 0) message += `，失败${errors.length}条`;

    console.log('[教材导入] 结果:', result);

    // 记录操作日志
    await createAuditLog({
      action: 'import',
      module: 'textbook',
      userId: req.user?.id,
      details: {
        total: rows.length,
        imported,
        skipped,
        overwritten,
        failed: errors.length,
      },
      result: errors.length > 0 ? 'failed' : 'success',
      message: `导入完成：新增${imported}条，跳过${skipped}条，覆盖${overwritten}条，失败${errors.length}条`,
    });

    success(res, result, message);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    
    // 记录错误日志
    await createAuditLog({
      action: 'import',
      module: 'textbook',
      userId: req.user?.id,
      result: 'failed',
      message: `教材导入失败: ${e.message}`,
    });
    
    next(e);
  }
});

export default router;
