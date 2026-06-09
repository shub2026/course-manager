import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { readWorkbook } from '../utils/excel.js';

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
router.post('/classes', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, '请上传文件');
    
    const onDuplicate = req.body.onDuplicate || 'skip'; // 'skip' | 'overwrite'
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;
    let skipped = 0;
    let overwritten = 0;

    console.log('[班级导入] 读取到', rows.length, '行数据, onDuplicate:', onDuplicate);

    const majors = await prisma.major.findMany();
    const majorMap = {};
    majors.forEach((m) => { majorMap[m.name] = m.id; });

    const levels = await prisma.trainingLevel.findMany();
    const levelMap = {};
    levels.forEach((l) => { levelMap[l.name] = l.id; });

    const colleges = await prisma.college.findMany();
    const collegeMap = {};
    colleges.forEach((c) => { collegeMap[c.name] = c.id; });

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

      console.log(`[班级导入] 第${i + 2}行:`, { name, enrollmentYear, durationYears, majorName, collegeName, trainingLevelName, studentCount, statusValue });

      if (!name || !enrollmentYear || !durationYears || !trainingLevelName) {
        errors.push(`第${i + 2}行：缺少必填字段（班级名称、入学年份、学制、培养层次）`);
        continue;
      }

      const majorId = majorName ? majorMap[majorName] : null;
      if (majorName && !majorId) {
        console.warn(`[班级导入] 第${i + 2}行：专业"${majorName}"不存在，将忽略`);
      }

      const collegeId = collegeName ? collegeMap[collegeName] : null;
      if (collegeName && !collegeId) {
        console.warn(`[班级导入] 第${i + 2}行：学院"${collegeName}"不存在，将忽略`);
      }

      const trainingLevelId = levelMap[trainingLevelName];
      if (!trainingLevelId) {
        errors.push(`第${i + 2}行：培养层次"${trainingLevelName}"不存在，请先在层次管理中添加`);
        continue;
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
        const graduationYear = Number(enrollmentYear) + Number(durationYears);
        status = new Date().getFullYear() < graduationYear ? 'active' : 'graduated';
      }

      try {
        // 检测重复：按班级名称
        const existingClass = await prisma.class.findFirst({
          where: { name: String(name).trim() }
        });

        if (existingClass) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[班级导入] 第${i + 2}行: 跳过重复数据 "${name}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
            await prisma.class.update({
              where: { id: existingClass.id },
              data: {
                name: String(name).trim(),
                enrollmentYear: Number(enrollmentYear),
                durationYears: Number(durationYears),
                majorId,
                collegeId,
                trainingLevelId,
                studentCount: studentCount ? Number(studentCount) : 0,
                status,
              },
            });
            overwritten++;
            console.log(`[班级导入] 第${i + 2}行: 覆盖更新 "${name}"`);
            continue;
          }
        }

        // 不存在则创建
        await prisma.class.create({
          data: {
            name: String(name).trim(),
            enrollmentYear: Number(enrollmentYear),
            durationYears: Number(durationYears),
            majorId,
            collegeId,
            trainingLevelId,
            studentCount: studentCount ? Number(studentCount) : 0,
            status,
          },
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
    };
    let message = `导入完成：新增${imported}条`;
    if (skipped > 0) message += `，跳过${skipped}条`;
    if (overwritten > 0) message += `，覆盖${overwritten}条`;
    if (errors.length > 0) message += `，失败${errors.length}条`;

    console.log('[班级导入] 结果:', result);

    success(res, result, message);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
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
        const existingCourse = await prisma.course.findFirst({
          where: { name: String(name).trim() }
        });

        if (existingCourse) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[课程导入] 第${i + 2}行: 跳过重复数据 "${name}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
            await prisma.course.update({
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
        await prisma.course.create({
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

    success(res, result, message);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
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
          existingTextbook = await prisma.textbook.findFirst({
            where: { OR: [{ title: String(title).trim() }, { isbn: String(isbn).trim() }] }
          });
        } else {
          existingTextbook = await prisma.textbook.findFirst({
            where: { title: String(title).trim() }
          });
        }

        if (existingTextbook) {
          if (onDuplicate === 'skip') {
            skipped++;
            console.log(`[教材导入] 第${i + 2}行: 跳过重复数据 "${title}"`);
            continue;
          } else if (onDuplicate === 'overwrite') {
            await prisma.textbook.update({
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
        await prisma.textbook.create({
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

    success(res, result, message);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    next(e);
  }
});

export default router;
