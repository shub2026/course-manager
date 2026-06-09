import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { readWorkbook } from '../utils/excel.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

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

    // 预加载现有数据
    let majors = await prisma.major.findMany();
    const majorMap = {};
    majors.forEach((m) => { majorMap[m.name] = m.id; });

    let levels = await prisma.trainingLevel.findMany();
    const levelMap = {};
    levels.forEach((l) => { levelMap[l.name] = l.id; });

    let colleges = await prisma.college.findMany();
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

      console.log(`[班级导入] 第${i + 2}行:`, { name, enrollmentYear, durationYears, majorName, collegeName, trainingLevelName, studentCount, statusValue });

      if (!name || !enrollmentYear || !durationYears || !trainingLevelName) {
        errors.push(`第${i + 2}行：缺少必填字段（班级名称、入学年份、学制、培养层次）`);
        continue;
      }

      // 自动创建培养层次（如果不存在）
      let trainingLevelId = levelMap[trainingLevelName];
      if (!trainingLevelId && trainingLevelName) {
        try {
          const newLevel = await prisma.trainingLevel.create({
            data: {
              name: String(trainingLevelName).trim(),
              code: null,
              description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
              sortOrder: 0,
            },
          });
          trainingLevelId = newLevel.id;
          levelMap[trainingLevelName] = trainingLevelId;
          autoCreatedLevels++;
          console.log(`[班级导入] 自动创建培养层次: "${trainingLevelName}" (ID: ${trainingLevelId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingLevel = await prisma.trainingLevel.findUnique({
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
          const newMajor = await prisma.major.create({
            data: {
              name: String(majorName).trim(),
              code: null,
              description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
              sortOrder: 0,
            },
          });
          majorId = newMajor.id;
          majorMap[majorName] = majorId;
          autoCreatedMajors++;
          console.log(`[班级导入] 自动创建专业: "${majorName}" (ID: ${majorId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingMajor = await prisma.major.findFirst({
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
          const newCollege = await prisma.college.create({
            data: {
              name: String(collegeName).trim(),
              code: null,
              description: `由班级导入自动创建 (${new Date().toLocaleString()})`,
              sortOrder: 0,
            },
          });
          collegeId = newCollege.id;
          collegeMap[collegeName] = collegeId;
          autoCreatedColleges++;
          console.log(`[班级导入] 自动创建学院: "${collegeName}" (ID: ${collegeId})`);
        } catch (e) {
          // 可能是唯一约束冲突（并发情况），重新查询
          const existingCollege = await prisma.college.findUnique({
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
                majorId: majorId || null,  // 确保传入null而不是undefined
                collegeId: collegeId || null,
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
            majorId: majorId || null,  // 确保传入null而不是undefined
            collegeId: collegeId || null,
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
