import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { createWorkbook, workbookToBuffer, createTemplateWorkbook } from '../utils/excel.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

const router = Router();

// GET /api/export/template/:type - 下载导入模板
router.get('/template/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    let headers = [];
    let sample = [];
    let filename = '';

    switch (type) {
      case 'classes':
        headers = [
          { label: '班级名称', key: 'name', width: 25 },
          { label: '入学年份', key: 'year', width: 12 },
          { label: '学制(年)', key: 'duration', width: 10 },
          { label: '专业类别', key: 'major', width: 20 },
          { label: '班级人数', key: 'count', width: 10 },
        ];
        sample = { '班级名称': '2024级学前1班', '入学年份': 2024, '学制(年)': 3, '专业类别': '学前教育', '班级人数': 45 };
        filename = '班级导入模板.xlsx';
        break;
      case 'courses':
        headers = [
          { label: '课程名称', key: 'name', width: 20 },
          { label: '课程编码', key: 'code', width: 15 },
          { label: '课程类型', key: 'type', width: 15 },
        ];
        sample = { '课程名称': '语文', '课程编码': 'CHN001', '课程类型': '公共基础课' };
        filename = '课程导入模板.xlsx';
        break;
      case 'textbooks':
        headers = [
          { label: '书名', key: 'title', width: 30 },
          { label: '书号', key: 'isbn', width: 20 },
          { label: '出版社', key: 'publisher', width: 20 },
          { label: '作者', key: 'author', width: 15 },
          { label: '版次', key: 'edition', width: 10 },
          { label: '定价', key: 'price', width: 10 },
        ];
        sample = { '书名': '大学语文', '书号': '978-7-04-012345-6', '出版社': '高等教育出版社', '作者': '张三', '版次': '第3版', '定价': 45.00 };
        filename = '教材导入模板.xlsx';
        break;
      default:
        return res.status(400).json({ success: false, message: '不支持的模板类型' });
    }

    const workbook = createTemplateWorkbook(headers, [sample]);
    const buffer = await workbookToBuffer(workbook);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (e) { next(e); }
});

// GET /api/export/semester - 导出当前学期开课情况
router.get('/semester', async (req, res, next) => {
  try {
    const semesterInfo = await getCurrentSemesterInfo();
    if (!semesterInfo) return res.status(400).json({ success: false, message: '请先设置当前学期' });

    const classes = await prisma.class.findMany({
      where: { status: 'active' },
      include: {
        major: true,
        customPlan: {
          include: {
            planCourses: {
              include: {
                course: true,
                planTextbooks: {
                  include: { textbook: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrollmentYear: 'desc' },
    });

    const majorIds = new Set();
    for (const cls of classes) {
      if (!cls.customPlanId) majorIds.add(cls.majorId);
    }

    const majorPlans = await prisma.trainingPlan.findMany({
      where: { majorId: { in: [...majorIds] } },
      include: {
        planCourses: {
          include: {
            course: true,
            planTextbooks: { include: { textbook: true } },
          },
        },
      },
    });

    const majorToPlan = new Map();
    for (const plan of majorPlans) {
      if (!majorToPlan.has(plan.majorId)) majorToPlan.set(plan.majorId, plan);
    }

    const rows = [];

    for (const cls of classes) {
      const grade = semesterInfo.startYear - cls.enrollmentYear + 1;
      if (grade < 1 || grade > cls.durationYears) continue;
      const currentSemesterNum = (grade - 1) * 2 + semesterInfo.semesterIndex;

      const plan = cls.customPlanId ? cls.customPlan : majorToPlan.get(cls.majorId);
      if (!plan) continue;

      const planCourses = plan.planCourses.filter(
        (pc) => pc.startSemester <= currentSemesterNum && pc.endSemester >= currentSemesterNum
      );

      if (planCourses.length === 0) {
        rows.push({
          '班级名称': cls.name, '专业': cls.major.name, '年级': grade,
          '学生人数': cls.studentCount, '课程': '-', '课程类型': '-',
          '周课时': '-', '学期总课时': '-', '使用教材': '-', '书号': '-',
        });
      } else {
        for (const pc of planCourses) {
          const textbooks = pc.planTextbooks.filter((pt) => pt.semester === currentSemesterNum);
          rows.push({
            '班级名称': cls.name, '专业': cls.major.name, '年级': grade,
            '学生人数': cls.studentCount, '课程': pc.course.name,
            '课程类型': pc.course.type === 'public' ? '公共基础课' : '专业课',
            '周课时': pc.weeklyHours,
            '学期总课时': pc.weeklyHours * pc.weeksPerSemester,
            '使用教材': textbooks.map((pt) => pt.textbook.title).join('、') || '未指定',
            '书号': textbooks.map((pt) => pt.textbook.isbn || '-').join('、') || '-',
          });
        }
      }
    }

    const headers = [
      { label: '班级名称', key: '班级名称', width: 25 },
      { label: '专业', key: '专业', width: 15 },
      { label: '年级', key: '年级', width: 8 },
      { label: '学生人数', key: '学生人数', width: 10 },
      { label: '课程', key: '课程', width: 20 },
      { label: '课程类型', key: '课程类型', width: 12 },
      { label: '周课时', key: '周课时', width: 8 },
      { label: '学期总课时', key: '学期总课时', width: 12 },
      { label: '使用教材', key: '使用教材', width: 30 },
      { label: '书号', key: '书号', width: 25 },
    ];

    const workbook = await createWorkbook(headers, rows);
    const buffer = await workbookToBuffer(workbook);
    const filename = `开课情况_${semesterInfo.startYear}-${semesterInfo.endYear}学年第${semesterInfo.semesterIndex}学期.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (e) { next(e); }
});

// GET /api/export/textbook/:id - 导出教材使用情况
router.get('/textbook/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const semesterInfo = await getCurrentSemesterInfo();
    if (!semesterInfo) return res.status(400).json({ success: false, message: '请先设置当前学期' });

    const [textbook, allClasses] = await Promise.all([
      prisma.textbook.findUnique({
        where: { id: Number(id) },
        include: {
          planTextbooks: {
            include: {
              planCourse: { include: { plan: { include: { major: true } }, course: true } },
            },
          },
        },
      }),
      prisma.class.findMany({
        where: { status: 'active' },
        include: { major: true },
      }),
    ]);

    if (!textbook) return res.status(404).json({ success: false, message: '教材不存在' });

    const rows = [];

    for (const pt of textbook.planTextbooks) {
      const pc = pt.planCourse;

      for (const cls of allClasses) {
        const grade = semesterInfo.startYear - cls.enrollmentYear + 1;
        const currentSemesterNum = (grade - 1) * 2 + semesterInfo.semesterIndex;
        if (currentSemesterNum !== pt.semester) continue;

        const isDefault = cls.majorId === pc.plan.majorId && !cls.customPlanId;
        const isCustom = cls.customPlanId === pc.planId;
        if (!isDefault && !isCustom) continue;

        rows.push({
          '教材名称': textbook.title, '书号': textbook.isbn || '-',
          '课程': pc.course.name, '使用班级': cls.name,
          '专业': cls.major.name, '年级': grade,
          '学生人数': cls.studentCount,
          '使用学期': `第${pt.semester}学期`,
          '是否必订': pt.isRequired ? '是' : '否',
        });
      }
    }

    const totalStudents = rows.reduce((sum, r) => sum + r['学生人数'], 0);
    rows.push({
      '教材名称': '合计', '书号': '', '课程': '',
      '使用班级': `${rows.length}个班级`, '专业': '', '年级': '',
      '学生人数': totalStudents, '使用学期': '', '是否必订': '',
    });

    const headers = [
      { label: '教材名称', key: '教材名称', width: 30 },
      { label: '书号', key: '书号', width: 25 },
      { label: '课程', key: '课程', width: 20 },
      { label: '使用班级', key: '使用班级', width: 25 },
      { label: '专业', key: '专业', width: 15 },
      { label: '年级', key: '年级', width: 8 },
      { label: '学生人数', key: '学生人数', width: 10 },
      { label: '使用学期', key: '使用学期', width: 12 },
      { label: '是否必订', key: '是否必订', width: 10 },
    ];

    const workbook = await createWorkbook(headers, rows);
    const buffer = await workbookToBuffer(workbook);
    const filename = `教材使用_${textbook.title}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (e) { next(e); }
});

export default router;
