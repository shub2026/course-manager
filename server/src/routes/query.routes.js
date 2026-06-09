import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

const router = Router();

/**
 * 计算班级在当前全局学期下的相对学期序号
 * 
 * 示例：当前全局学期为 2025-2026学年 第2学期（2026年春季）
 * - 2025年入学(1年级): 第 (1-1)*2 + 2 = 2 学期 (他们的第2个学期)
 * - 2024年入学(2年级): 第 (2-1)*2 + 2 = 4 学期 (他们的第4个学期)
 * - 2023年入学(3年级): 第 (3-1)*2 + 2 = 6 学期 (他们的第6个学期)
 * 
 * @param {Object} cls - 班级对象
 * @param {Object} semesterInfo - 学期信息 { startYear, endYear, semesterIndex }
 * @returns {Object} { grade, currentSemesterNum } 或 null（超出学制）
 */
function calcClassSemester(cls, semesterInfo) {
  const grade = semesterInfo.startYear - cls.enrollmentYear + 1;
  if (grade < 1 || grade > cls.durationYears) return null;
  const currentSemesterNum = (grade - 1) * 2 + semesterInfo.semesterIndex;
  return { grade, currentSemesterNum };
}

// GET /api/query/semester - 当前学期开课查询
router.get('/semester', async (req, res, next) => {
  try {
    const semesterInfo = await getCurrentSemesterInfo();
    if (!semesterInfo) return fail(res, '请先设置当前学期');

    const { majorId, collegeId, trainingLevelId, enrollmentYear, grade } = req.query;
    const classWhere = { status: 'active' };
    if (majorId) classWhere.majorId = Number(majorId);
    if (collegeId) classWhere.collegeId = Number(collegeId);
    if (trainingLevelId) classWhere.trainingLevelId = Number(trainingLevelId);
    if (enrollmentYear) classWhere.enrollmentYear = Number(enrollmentYear);

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        major: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        trainingLevel: { select: { id: true, name: true } },
        customPlan: {
          include: {
            planCourses: {
              include: {
                course: { select: { id: true, name: true, type: true } },
                planCourseSemesters: {
                  include: {
                    textbooks: {
                      include: { textbook: { select: { id: true, title: true, isbn: true, publisher: true } } },
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
    const classPlanMap = new Map();

    for (const cls of classes) {
      const calc = calcClassSemester(cls, semesterInfo);
      if (!calc) continue;
      if (cls.customPlanId) {
        classPlanMap.set(cls.id, cls.customPlan);
      } else {
        // 同时收集专业和层次的方案ID
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
            course: { select: { id: true, name: true, type: true } },
            planCourseSemesters: {
              include: {
                textbooks: {
                  include: { textbook: { select: { id: true, title: true, isbn: true, publisher: true } } },
                },
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
        return classPlanMap.get(cls.id);
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

    const results = [];

    for (const cls of classes) {
      const calc = calcClassSemester(cls, semesterInfo);
      if (!calc) continue;

      // 如果指定了年级筛选，检查是否匹配
      if (grade && calc.grade !== Number(grade)) continue;

      const plan = findBestMatchPlan(cls);
      if (!plan) continue;

      const planCourses = plan.planCourses.filter(
        (pc) => pc.startSemester <= calc.currentSemesterNum && pc.endSemester >= calc.currentSemesterNum
      );

      const courses = planCourses.map((pc) => {
        const semRecord = pc.planCourseSemesters?.find(s => s.semester === calc.currentSemesterNum);
        return {
          courseId: pc.course.id,
          courseName: pc.course.name,
          courseType: pc.course.type,
          weeklyHours: semRecord?.weeklyHours || pc.weeklyHours,
          weeksPerSemester: semRecord?.weeksCount || pc.weeksPerSemester,
          totalHoursThisSemester: (semRecord?.weeklyHours || pc.weeklyHours) * (semRecord?.weeksCount || pc.weeksPerSemester),
          textbooks: (semRecord?.textbooks || []).map((pt) => ({
            id: pt.textbook.id,
            title: pt.textbook.title,
            isbn: pt.textbook.isbn,
            publisher: pt.textbook.publisher,
            isRequired: pt.isRequired,
          })),
        };
      });

      results.push({
        classId: cls.id,
        className: cls.name,
        collegeName: cls.college?.name || null,
        majorName: cls.major?.name || null,
        trainingLevelName: cls.trainingLevel?.name || null,
        enrollmentYear: cls.enrollmentYear,
        grade: calc.grade,
        currentSemester: calc.currentSemesterNum,
        studentCount: cls.studentCount,
        planName: plan.name,
        courses,
      });
    }

    success(res, {
      semesterInfo: {
        label: semesterInfo.label,
        ...semesterInfo,
      },
      totalClasses: results.length,
      data: results,
    });
  } catch (e) { next(e); }
});

// GET /api/query/textbook/:id - 教材使用情况查询
router.get('/textbook/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const semesterInfo = await getCurrentSemesterInfo();
    if (!semesterInfo) return fail(res, '请先设置当前学期');

    const textbook = await prisma.textbook.findUnique({ where: { id: Number(id) } });
    if (!textbook) return fail(res, '教材不存在', 404);

    const [planTextbooks, allClasses] = await Promise.all([
      prisma.planTextbook.findMany({
        where: { textbookId: Number(id) },
        include: {
          semester: {
            include: {
              planCourse: {
                include: {
                  plan: { include: { major: true, trainingLevel: true } },
                  course: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.class.findMany({
        where: { status: 'active' },
        include: { 
          major: { select: { name: true } },
          trainingLevel: true,
        },
      }),
    ]);

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

    const classResults = [];

    for (const pt of planTextbooks) {
      const sem = pt.semester;
      const pc = sem.planCourse;
      const plan = pc.plan;
      if (sem.semester < pc.startSemester || sem.semester > pc.endSemester) continue;

      const gradeForThisSemester = Math.ceil(sem.semester / 2);
      const enrollmentYear = semesterInfo.startYear - gradeForThisSemester + 1;

      for (const cls of allClasses) {
        if (cls.enrollmentYear !== enrollmentYear) continue;
        if (!isClassMatchPlan(cls, plan)) continue;
        const calc = calcClassSemester(cls, semesterInfo);
        if (!calc || calc.currentSemesterNum !== sem.semester) continue;

        classResults.push({
          classId: cls.id,
          className: cls.name,
          majorName: cls.major?.name || null,
          trainingLevelName: cls.trainingLevel?.name || null,
          studentCount: cls.studentCount,
          grade: calc.grade,
          semester: sem.semester,
          courseName: pc.course.name,
          isRequired: pt.isRequired,
        });
      }
    }

    const totalStudents = classResults.reduce((sum, c) => sum + c.studentCount, 0);

    success(res, {
      textbook: {
        id: textbook.id,
        title: textbook.title,
        isbn: textbook.isbn,
        publisher: textbook.publisher,
        author: textbook.author,
      },
      semesterInfo: {
        label: semesterInfo.label,
      },
      classes: classResults,
      totalClasses: classResults.length,
      totalStudents,
    });
  } catch (e) { next(e); }
});

// GET /api/query/textbooks - 所有教材使用情况概览
router.get('/textbooks', async (req, res, next) => {
  try {
    const semesterInfo = await getCurrentSemesterInfo();
    if (!semesterInfo) return fail(res, '请先设置当前学期');

    const [textbooks, allClasses] = await Promise.all([
      prisma.textbook.findMany({
        include: {
          planTextbooks: {
            include: {
              semester: {
                include: {
                  planCourse: {
                    include: {
                      plan: { include: { major: true, trainingLevel: true } },
                      course: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.class.findMany({ where: { status: 'active' } }),
    ]);

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

    const results = [];

    for (const tb of textbooks) {
      let totalStudents = 0;
      const usedClasses = new Set();

      for (const pt of tb.planTextbooks) {
        const sem = pt.semester;
        const pc = sem.planCourse;
        const plan = pc.plan;
        if (sem.semester < pc.startSemester || sem.semester > pc.endSemester) continue;

        const gradeForThisSemester = Math.ceil(sem.semester / 2);
        const enrollmentYear = semesterInfo.startYear - gradeForThisSemester + 1;

        for (const c of allClasses) {
          if (c.enrollmentYear !== enrollmentYear) continue;
          if (isClassMatchPlan(c, plan)) {
            usedClasses.add(c.id);
            totalStudents += c.studentCount;
          }
        }
      }

      results.push({
        id: tb.id,
        title: tb.title,
        isbn: tb.isbn,
        publisher: tb.publisher,
        classCount: usedClasses.size,
        totalStudents,
      });
    }

    success(res, results);
  } catch (e) { next(e); }
});

export default router;
