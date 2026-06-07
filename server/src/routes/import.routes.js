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
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;

    const majors = await prisma.major.findMany();
    const majorMap = {};
    majors.forEach((m) => { majorMap[m.name] = m.id; });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['班级名称'];
      const enrollmentYear = row['入学年份'];
      const durationYears = row['学制(年)'];
      const majorName = row['专业类别'];
      const studentCount = row['班级人数'];

      if (!name || !enrollmentYear || !durationYears || !majorName) {
        errors.push(`第${i + 2}行：缺少必填字段`);
        continue;
      }

      const majorId = majorMap[majorName];
      if (!majorId) {
        errors.push(`第${i + 2}行：专业"${majorName}"不存在`);
        continue;
      }

      try {
        await prisma.class.create({
          data: {
            name: String(name),
            enrollmentYear: Number(enrollmentYear),
            durationYears: Number(durationYears),
            majorId,
            studentCount: Number(studentCount) || 0,
          },
        });
        imported++;
      } catch (e) {
        errors.push(`第${i + 2}行：${e.message}`);
      }
    }

    success(res, { imported, errors, total: rows.length }, `导入完成：成功${imported}条，失败${errors.length}条`);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    next(e);
  }
});

// POST /api/import/courses - 批量导入课程
router.post('/courses', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, '请上传文件');
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['课程名称'];
      const code = row['课程编码'] || null;
      const type = row['课程类型'] === '专业课' ? 'professional' : 'public';

      if (!name) {
        errors.push(`第${i + 2}行：缺少课程名称`);
        continue;
      }

      try {
        await prisma.course.create({ data: { name: String(name), code, type } });
        imported++;
      } catch (e) {
        errors.push(`第${i + 2}行：${e.message}`);
      }
    }

    success(res, { imported, errors, total: rows.length }, `导入完成：成功${imported}条，失败${errors.length}条`);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    next(e);
  }
});

// POST /api/import/textbooks - 批量导入教材
router.post('/textbooks', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, '请上传文件');
    const rows = await readWorkbook(req.file.path);
    cleanupFile(req.file.path);
    const errors = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const title = row['书名'];
      const isbn = row['书号'] || null;
      const publisher = row['出版社'] || null;
      const author = row['作者'] || null;
      const edition = row['版次'] || null;
      const price = row['定价'] ? Number(row['定价']) : null;

      if (!title) {
        errors.push(`第${i + 2}行：缺少书名`);
        continue;
      }

      try {
        await prisma.textbook.create({
          data: { title: String(title), isbn, publisher, author, edition, price },
        });
        imported++;
      } catch (e) {
        errors.push(`第${i + 2}行：${e.message}`);
      }
    }

    success(res, { imported, errors, total: rows.length }, `导入完成：成功${imported}条，失败${errors.length}条`);
  } catch (e) {
    if (req.file) cleanupFile(req.file.path);
    next(e);
  }
});

export default router;
