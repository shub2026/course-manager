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
          { label: '二级学院', key: 'college', width: 20 },
          { label: '培养层次', key: 'trainingLevel', width: 15 },
          { label: '班级人数', key: 'count', width: 10 },
          { label: '状态', key: 'status', width: 10 },
        ];
        sample = { '班级名称': '2024级学前1班', '入学年份': 2024, '学制(年)': 3, '专业类别': '学前教育', '二级学院': '教育学院', '培养层次': '大专', '班级人数': 45, '状态': '在读' };
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
          { label: '类别', key: 'category', width: 10 },
        ];
        sample = { '书名': '大学语文', '书号': '978-7-04-012345-6', '出版社': '高等教育出版社', '作者': '张三', '版次': '第3版', '定价': 45.00, '类别': '技工' };
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
        college: true,
        trainingLevel: true,
        customPlan: {
          include: {
            planCourses: {
              include: {
                course: true,
                planCourseSemesters: {
                  include: {
                    textbooks: {
                      include: { textbook: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrollmentYear: 'desc' },
    });

    // 收集需要查询的方案ID：按专业匹配的和按层次匹配的
    const majorPlanIds = new Set();
    const levelPlanIds = new Set();
    for (const cls of classes) {
      if (!cls.customPlanId) {
        if (cls.majorId) majorPlanIds.add(cls.majorId);
        if (cls.trainingLevelId) levelPlanIds.add(cls.trainingLevelId);
      }
    }

    // 查询所有可能匹配的培养方案（包括按专业和按层次）
    const matchingPlans = await prisma.trainingPlan.findMany({
      where: {
        OR: [
          { majorId: { in: [...majorPlanIds] } },
          { trainingLevelId: { in: [...levelPlanIds] } },
        ],
      },
      include: {
        planCourses: {
          include: {
            course: true,
            planCourseSemesters: {
              include: {
                textbooks: { include: { textbook: true } },
              },
            },
          },
        },
      },
    });

    // 为每个班级找到匹配的培养方案
    // 优先级：1.自定义方案 > 2.根据培养方案的关联类型进行匹配
    function findBestMatchPlan(cls) {
      // 1. 自定义方案优先
      if (cls.customPlanId) {
        return cls.customPlan;
      }

      // 2. 遍历所有方案，根据方案的关联类型来匹配
      // 如果方案是按专业关联的，则检查班级的majorId是否匹配
      // 如果方案是按层次关联的，则检查班级的trainingLevelId是否匹配
      for (const plan of matchingPlans) {
        // 方案按专业关联：检查班级的专业是否匹配
        if (plan.majorId && plan.majorId === cls.majorId) {
          return plan;
        }
        
        // 方案按层次关联：检查班级的层次是否匹配
        if (plan.trainingLevelId && plan.trainingLevelId === cls.trainingLevelId) {
          return plan;
        }
      }

      return null;
    }

    const rows = [];

    for (const cls of classes) {
      const grade = semesterInfo.startYear - cls.enrollmentYear + 1;
      if (grade < 1 || grade > cls.durationYears) continue;
      const currentSemesterNum = (grade - 1) * 2 + semesterInfo.semesterIndex;

      const plan = findBestMatchPlan(cls);
      if (!plan) continue;

      const planCourses = plan.planCourses.filter(
        (pc) => pc.startSemester <= currentSemesterNum && pc.endSemester >= currentSemesterNum
      );

      if (planCourses.length === 0) {
        rows.push({
          '班级名称': cls.name, 
          '二级学院': cls.college?.name || '-',
          '专业': cls.major?.name || '-', 
          '培养层次': cls.trainingLevel?.name || '-',
          '入学年份': cls.enrollmentYear,
          '年级': grade,
          '学生人数': Number(cls.studentCount) || 0, 
          '课程': '-', 
          '课程类型': '-',
          '周课时': '-', 
          '学期总课时': '-', 
          '使用教材': '-', 
          '书号': '-',
        });
      } else {
        for (const pc of planCourses) {
          // 先找到对应学期的记录，再获取其教材
          const semRecord = pc.planCourseSemesters?.find(s => s.semester === currentSemesterNum);
          const textbooks = semRecord?.textbooks || [];
          
          // 使用学期记录的周课时和周数，如果没有则使用课程默认值
          const weeklyHours = semRecord?.weeklyHours || pc.weeklyHours;
          const weeksCount = semRecord?.weeksCount || pc.weeksPerSemester;
          
          rows.push({
            '班级名称': cls.name, 
            '二级学院': cls.college?.name || '-',
            '专业': cls.major?.name || '-', 
            '培养层次': cls.trainingLevel?.name || '-',
            '入学年份': cls.enrollmentYear,
            '年级': grade,
            '学生人数': Number(cls.studentCount) || 0, 
            '课程': pc.course.name,
            '课程类型': pc.course.type === 'public' ? '公共基础课' : '专业课',
            '周课时': weeklyHours,
            '学期总课时': weeklyHours * weeksCount,
            '使用教材': textbooks.map((pt) => pt.textbook.title).join('、') || '未指定',
            '书号': textbooks.map((pt) => pt.textbook.isbn || '-').join('、') || '-',
          });
        }
      }
    }

    const headers = [
      { label: '班级名称', key: '班级名称', width: 25 },
      { label: '二级学院', key: '二级学院', width: 15 },
      { label: '专业', key: '专业', width: 15 },
      { label: '培养层次', key: '培养层次', width: 12 },
      { label: '入学年份', key: '入学年份', width: 12 },
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
    const filename = `开课情况_${semesterInfo.label}.xlsx`;
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
              semester: {
                include: {
                  planCourse: { 
                    include: { 
                      plan: { include: { major: true, trainingLevel: true } }, 
                      course: true 
                    } 
                  },
                },
              },
            },
          },
        },
      }),
      prisma.class.findMany({
        where: { status: 'active' },
        include: { major: true, trainingLevel: true },
      }),
    ]);

    if (!textbook) return res.status(404).json({ success: false, message: '教材不存在' });

    // 判断班级是否匹配培养方案（支持按专业和按层次两种方式）
    function isClassMatchPlan(cls, plan) {
      // 1. 自定义方案
      if (cls.customPlanId === plan.id) return true;
      
      // 2. 按专业匹配（仅当班级未指定自定义方案时）
      if (!cls.customPlanId && cls.majorId === plan.majorId) return true;
      
      // 3. 按层次匹配（仅当班级未指定自定义方案时）
      if (!cls.customPlanId && cls.trainingLevelId === plan.trainingLevelId) return true;
      
      return false;
    }

    const rows = [];

    for (const pt of textbook.planTextbooks) {
      const sem = pt.semester;
      const pc = sem.planCourse;
      const plan = pc.plan;

      for (const cls of allClasses) {
        const grade = semesterInfo.startYear - cls.enrollmentYear + 1;
        const currentSemesterNum = (grade - 1) * 2 + semesterInfo.semesterIndex;
        if (currentSemesterNum !== sem.semester) continue;

        if (!isClassMatchPlan(cls, plan)) continue;

        rows.push({
          '教材名称': textbook.title, '书号': textbook.isbn || '-',
          '课程': pc.course.name, '使用班级': cls.name,
          '专业': cls.major?.name || '-', '培养层次': cls.trainingLevel?.name || '-',
          '年级': grade, '学生人数': Number(cls.studentCount) || 0,
          '使用学期': `第${sem.semester}学期`,
          '是否必订': pt.isRequired ? '是' : '否',
        });
      }
    }

    const totalStudents = rows.reduce((sum, r) => sum + (Number(r['学生人数']) || 0), 0);
    rows.push({
      '教材名称': '合计', '书号': '', '课程': '',
      '使用班级': `${rows.length}个班级`, '专业': '', '培养层次': '',
      '年级': '', '学生人数': totalStudents, '使用学期': '', '是否必订': '',
    });

    const headers = [
      { label: '教材名称', key: '教材名称', width: 30 },
      { label: '书号', key: '书号', width: 25 },
      { label: '课程', key: '课程', width: 20 },
      { label: '使用班级', key: '使用班级', width: 25 },
      { label: '专业', key: '专业', width: 15 },
      { label: '培养层次', key: '培养层次', width: 15 },
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
