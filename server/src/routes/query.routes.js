import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

const router = Router();

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

    const { majorId, collegeId, trainingLevelId } = req.query;
    const classWhere = { status: 'active' };
    if (majorId) classWhere.majorId = Number(majorId);
    if (collegeId) classWhere.collegeId = Number(collegeId);
    if (trainingLevelId) classWhere.trainingLevelId = Number(trainingLevelId);

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

    const planIds = new Set();
    const classPlanMap = new Map();

    for (const cls of classes) {
      const calc = calcClassSemester(cls, semesterInfo);
      if (!calc) continue;
      if (cls.customPlanId) {
        classPlanMap.set(cls.id, cls.customPlan);
      } else {
        planIds.add(cls.majorId);
      }
    }

    const majorPlans = await prisma.trainingPlan.findMany({
      where: { majorId: { in: [...planIds] } },
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

    const majorToPlan = new Map();
    for (const plan of majorPlans) {
      if (!majorToPlan.has(plan.majorId)) {
        majorToPlan.set(plan.majorId, plan);
      }
    }

    const results = [];

    for (const cls of classes) {
      const calc = calcClassSemester(cls, semesterInfo);
      if (!calc) continue;

      const plan = cls.customPlanId ? classPlanMap.get(cls.id) : majorToPlan.get(cls.majorId);
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
        majorName: cls.major.name,
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
        label: `${semesterInfo.startYear}-${semesterInfo.endYear}学年 第${semesterInfo.semesterIndex}学期`,
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
                  plan: { include: { major: true } },
                  course: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.class.findMany({
        where: { status: 'active' },
        include: { major: { select: { name: true } } },
      }),
    ]);

    const classResults = [];

    for (const pt of planTextbooks) {
      const sem = pt.semester;
      const pc = sem.planCourse;
      if (sem.semester < pc.startSemester || sem.semester > pc.endSemester) continue;

      const gradeForThisSemester = Math.ceil(sem.semester / 2);
      const enrollmentYear = semesterInfo.startYear - gradeForThisSemester + 1;

      for (const cls of allClasses) {
        if (cls.enrollmentYear !== enrollmentYear) continue;
        const isDefaultPlan = cls.majorId === pc.plan.majorId && !cls.customPlanId;
        const isCustomPlan = cls.customPlanId === pc.planId;
        if (!isDefaultPlan && !isCustomPlan) continue;
        const calc = calcClassSemester(cls, semesterInfo);
        if (!calc || calc.currentSemesterNum !== sem.semester) continue;

        classResults.push({
          classId: cls.id,
          className: cls.name,
          majorName: cls.major.name,
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
        label: `${semesterInfo.startYear}-${semesterInfo.endYear}学年 第${semesterInfo.semesterIndex}学期`,
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
                      plan: { include: { major: true } },
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

    const results = [];

    for (const tb of textbooks) {
      let totalStudents = 0;
      const usedClasses = new Set();

      for (const pt of tb.planTextbooks) {
        const sem = pt.semester;
        const pc = sem.planCourse;
        if (sem.semester < pc.startSemester || sem.semester > pc.endSemester) continue;

        const gradeForThisSemester = Math.ceil(sem.semester / 2);
        const enrollmentYear = semesterInfo.startYear - gradeForThisSemester + 1;

        for (const c of allClasses) {
          if (c.enrollmentYear !== enrollmentYear) continue;
          const isMatch = (c.majorId === pc.plan.majorId && !c.customPlanId) || c.customPlanId === pc.planId;
          if (isMatch) {
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
