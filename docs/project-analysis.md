# KEC课程管理平台 - 项目深度分析报告

## 一、项目概述

### 1.1 项目定位
**KEC课程管理平台（Course Management Platform）** 是一个面向教学管理人员的轻量级课程管理系统，用于管理课程、班级、人才培养方案和教材信息，支持按学期查询开课情况和教材使用情况，并提供Excel报表导出功能。

### 1.2 目标用户与规模
- **用户群体**：教学管理人员（1-3人）
- **业务规模**：
  - 专业：3-5个
  - 班级：≤300个
  - 培养方案：3-5套
  - 学院：若干二级学院
  - 培养层次：大专、本科、研究生等

### 1.3 核心价值主张
1. **自动化年级推算**：根据入学年份和学制自动计算班级在读年级和学期
2. **灵活的方案匹配**：支持按专业、按培养层次或自定义方式关联培养方案
3. **可视化矩阵编辑**：以"学期×课程"矩阵形式直观配置培养方案
4. **智能数据导入**：批量导入时自动创建缺失的基础数据（学院、专业、层次）
5. **独立运行**：不依赖外部系统，可本地部署，成熟后可上云

---

## 二、技术架构详解

### 2.1 技术栈全景

#### 前端技术栈
| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Vue 3 | ^3.5.34 | UI框架 | Composition API + 响应式系统 |
| Element Plus | ^2.14.1 | UI组件库 | 企业级Vue 3组件库 |
| Vite | ^5.4.21 | 构建工具 | 快速开发服务器和热更新 |
| Pinia | ^3.0.4 | 状态管理 | Vue 3官方推荐状态管理 |
| Vue Router | ^4.6.4 | 路由管理 | 单页应用路由 |
| Axios | ^1.17.0 | HTTP客户端 | RESTful API调用 |
| @element-plus/icons-vue | ^2.3.2 | 图标库 | Element Plus图标集 |
| SortableJS | ^1.15.7 | 拖拽排序 | 列表拖拽排序 |

#### 后端技术栈
| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Node.js | - | 运行时环境 | JavaScript运行时 |
| Express | ^5.1.0 | Web框架 | 轻量级Web应用框架 |
| Prisma Client | ^6.10.1 | ORM | 类型安全的数据库ORM |
| SQLite | - | 数据库 | 本地零配置数据库（可迁移MySQL） |
| Multer | ^2.0.1 | 文件上传 | 处理multipart/form-data |
| ExcelJS | ^4.4.0 | Excel处理 | 读写Excel文件 |
| CORS | ^2.8.5 | 跨域处理 | 跨域资源共享中间件 |

#### 开发工具
- **concurrently**：同时启动前后端开发服务器
- **nodemon**：后端代码热重载

### 2.2 项目结构

```
kec-manager/
├── client/                    # 前端项目 (Vue 3)
│   ├── src/
│   │   ├── api/              # API接口封装 (9个模块)
│   │   │   ├── major.js      # 专业API
│   │   │   ├── college.js    # 学院API
│   │   │   ├── trainingLevel.js  # 培养层次API
│   │   │   ├── course.js     # 课程API
│   │   │   ├── textbook.js   # 教材API
│   │   │   ├── class.js      # 班级API
│   │   │   ├── plan.js       # 培养方案API
│   │   │   ├── query.js      # 查询API
│   │   │   └── setting.js    # 系统设置API
│   │   ├── components/       # 公共组件
│   │   │   ├── Layout.vue    # 布局组件（导航+顶栏+主内容区）
│   │   │   └── CourseMatrix.vue  # 课程矩阵编辑器（核心复杂组件）
│   │   ├── views/            # 页面视图 (14个页面)
│   │   │   ├── Dashboard.vue         # 首页概览
│   │   │   ├── Majors.vue            # 专业管理
│   │   │   ├── Colleges.vue          # 学院管理
│   │   │   ├── TrainingLevels.vue    # 培养层次
│   │   │   ├── Courses.vue           # 课程管理
│   │   │   ├── Textbooks.vue         # 教材管理
│   │   │   ├── Classes.vue           # 班级管理
│   │   │   ├── Plans.vue             # 培养方案列表
│   │   │   ├── PlanDetail.vue        # 方案明细编辑
│   │   │   ├── QuerySemester.vue     # 当前学期开课查询
│   │   │   ├── QueryPlan.vue         # 培养方案查询
│   │   │   ├── QueryTextbook.vue     # 教材使用查询
│   │   │   ├── Settings.vue          # 系统设置
│   │   │   └── AuditLogs.vue         # 操作日志
│   │   ├── router/           # 路由配置
│   │   │   └── index.js      # 路由定义
│   │   ├── stores/           # Pinia状态管理
│   │   │   └── settings.js   # 系统设置状态
│   │   ├── utils/            # 工具函数
│   │   │   └── request.js    # Axios封装（拦截器+错误处理）
│   │   ├── App.vue           # 根组件
│   │   └── main.js           # 入口文件
│   ├── vite.config.js        # Vite配置（含API代理）
│   └── package.json
│
├── server/                    # 后端项目 (Express)
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型定义 (10个表)
│   │   └── migrations/       # 数据库迁移文件
│   ├── src/
│   │   ├── routes/           # 路由层 (12个路由模块)
│   │   │   ├── major.routes.js       # 专业路由
│   │   │   ├── college.routes.js     # 学院路由
│   │   │   ├── trainingLevel.routes.js  # 培养层次路由
│   │   │   ├── course.routes.js      # 课程路由
│   │   │   ├── textbook.routes.js    # 教材路由
│   │   │   ├── class.routes.js       # 班级路由
│   │   │   ├── plan.routes.js        # 培养方案路由
│   │   │   ├── query.routes.js       # 查询路由
│   │   │   ├── import.routes.js      # 导入路由
│   │   │   ├── export.routes.js      # 导出路由
│   │   │   ├── setting.routes.js     # 系统设置路由
│   │   │   └── audit.routes.js       # 审计日志路由
│   │   ├── services/         # 业务逻辑层
│   │   │   ├── settings.service.js   # 设置服务
│   │   │   └── audit.service.js      # 审计服务
│   │   ├── middleware/       # 中间件
│   │   │   └── error.middleware.js   # 全局错误处理
│   │   ├── lib/              # 核心库
│   │   │   └── prisma.js     # Prisma实例
│   │   ├── utils/            # 工具函数
│   │   │   ├── response.js   # 统一响应格式
│   │   │   └── excel.js      # Excel处理工具
│   │   ├── app.js            # Express应用配置
│   │   └── server.js         # 服务器入口
│   ├── uploads/              # 临时上传文件目录
│   └── package.json
│
├── docs/                     # 文档目录
│   ├── project-analysis.md   # 项目分析报告（本文档）
│   ├── plan.md               # 详细实施方案文档
│   ├── class-status-fix.md   # 班级状态修复文档
│   ├── semester-calculation.md  # 学期计算文档
│   └── system-reset-feature.md  # 系统重置功能文档
│
└── package.json              # 根目录脚本（concurrently启动前后端）
```

### 2.3 开发工作流

```bash
# 同时启动前后端开发服务器
npm run dev

# 单独启动
npm run dev:server    # 后端 http://localhost:3000
npm run dev:client    # 前端 http://localhost:5173

# 数据库操作
npm run db:migrate    # 执行数据库迁移
npm run db:generate   # 生成Prisma客户端

# 构建生产版本
npm run build         # 构建前端静态资源
```

### 2.4 前后端通信机制

#### Vite代理配置（开发环境）
```javascript
// client/vite.config.js
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    }
  }
}
```

#### Axios拦截器
```javascript
// client/src/utils/request.js
const service = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 响应拦截器
service.interceptors.response.use(
  response => response.data,
  error => {
    // 统一错误处理
    ElMessage.error(error.message || '请求失败')
    return Promise.reject(error)
  }
)
```

---

## 三、核心功能模块详解

### 3.1 基础数据管理

#### 3.1.1 专业管理 (`/majors`)
**功能描述**：专业的增删改查

**数据字段**：
- `id`: 唯一标识
- `name`: 专业名称
- `code`: 专业编码
- `description`: 专业描述
- `sort_order`: 排序序号

**业务特点**：简单CRUD，无复杂业务逻辑，为班级和方案提供基础数据

#### 3.1.2 学院管理 (`/colleges`)
**功能描述**：二级学院的增删改查

**数据字段**：
- `id`: 唯一标识
- `name`: 学院名称（唯一约束）
- `code`: 学院编码
- `description`: 学院描述
- `sort_order`: 排序序号

**业务用途**：为班级提供学院维度分类，支持按学院筛选和统计

#### 3.1.3 培养层次管理 (`/training-levels`)
**功能描述**：培养层次的增删改查

**数据字段**：
- `id`: 唯一标识
- `name`: 层次名称（唯一约束，如"大专"、"本科"、"研究生"）
- `code`: 层次编码
- `description`: 层次描述
- `sort_order`: 排序序号

**特殊机制**：班级导入时可自动创建不存在的培养层次，避免手动预置数据

#### 3.1.4 课程管理 (`/courses`)
**功能描述**：课程的增删改查 + Excel批量导入

**数据字段**：
- `id`: 唯一标识
- `name`: 课程名称
- `code`: 课程编码
- `type`: 课程类型（`public`公共基础课 / `professional`专业课）
- `description`: 课程描述

**导入模板**：课程名称、课程编码、课程类型

**业务价值**：课程是培养方案的核心组成元素，分为公共课和专业课两类

#### 3.1.5 教材管理 (`/textbooks`)
**功能描述**：教材的增删改查 + Excel批量导入

**数据字段**：
- `id`: 唯一标识
- `title`: 书名
- `isbn`: ISBN号
- `publisher`: 出版社
- `author`: 作者
- `edition`: 版次
- `publish_date`: 出版日期
- `price`: 定价
- `category`: 类别
- `is_active`: 是否启用

**导入模板**：7个字段（书名、ISBN、出版社、作者、版次、出版日期、定价）

**业务用途**：为培养方案中的课程提供教材关联，支持教材使用情况查询

#### 3.1.6 班级管理 (`/classes`) ⭐核心模块

**功能描述**：班级的增删改查 + Excel批量导入 + 批量操作

**数据字段**：
- **基本信息**：
  - `id`: 唯一标识
  - `name`: 班级名称
  - `enrollment_year`: 入学年份（如2024）
  - `duration_years`: 学制（年，如3年制填3）
  - `student_count`: 人数
  - `status`: 状态（`active`在读 / `graduated`已毕业）

- **关联信息**：
  - `major_id`: 专业ID（外键→majors）
  - `college_id`: 学院ID（外键→colleges）
  - `training_level_id`: 培养层次ID（外键→training_levels）
  - `custom_plan_id`: 自定义培养方案ID（外键→training_plans，可选）

**核心特性**：

1. **自动状态计算**：根据入学年份、学制和当前学期自动判断"在读/已毕业"

   **年级推算算法**：
   ```javascript
   // 从系统设置获取当前学期（如 "2025-2026-2"）
   const [startYear, endYear, semesterIndex] = current_semester.split('-').map(Number)

   // 计算当前年级
   const grade = startYear - enrollment_year + 1

   // 计算当前学期序号（第几个学期）
   const currentSemesterNum = (grade - 1) * 2 + semesterIndex

   // 判断状态
   const totalSemesters = duration_years * 2
   const status = currentSemesterNum <= totalSemesters ? 'active' : 'graduated'
   ```

   **示例场景**：
   - 班级A：2024年入学，3年制
   - 当前学期：2025-2026学年 第2学期
   - 计算：grade = 2025 - 2024 + 1 = 2年级
   - 当前学期序号 = (2-1)×2 + 2 = 第4学期
   - 总学期数 = 3 × 2 = 6学期
   - 第4学期 ≤ 6学期 → status = 'active' (在读)

2. **灵活筛选**：支持按名称、学院、专业、层次、入学年份、状态、培养方案筛选

3. **批量操作**：支持批量删除、批量设置专业/学院/层次/入学年份/学制/状态

4. **分页加载**：支持10/20/50/100条每页

5. **智能导入**：导入时自动创建不存在的学院、专业、培养层次

   **智能导入流程**：
   ```
   1. 读取Excel行数据
   2. 提取培养层次名称 → 查找是否存在
      ├─ 存在 → 使用现有ID
      └─ 不存在 → 自动创建并返回新ID
   3. 提取学院名称 → 同上逻辑
   4. 提取专业名称 → 同上逻辑
   5. 创建班级记录
   ```

---

### 3.2 培养方案管理 (`/plans`) ⭐⭐最复杂模块

#### 3.2.1 方案基本信息

**功能描述**：培养方案的增删改查

**数据字段**：
- `id`: 唯一标识
- `name`: 方案名称
- `major_id`: 专业ID（外键→majors，可选）
- `training_level_id`: 培养层次ID（外键→training_levels，可选）
- `version`: 版本号
- `description`: 方案描述

**关联规则**：专业和层次**二选一**，不能同时选择

**方案匹配优先级**：
1. **班级自定义方案**（`custom_plan_id`）：最高优先级，明确指定
2. **按专业匹配的方案**（`major_id`）：次优先级，同专业班级默认使用
3. **按培养层次匹配的方案**（`training_level_id`）：最后优先级，同层次班级默认使用

**匹配逻辑伪代码**：
```javascript
function getPlanForClass(classData) {
  // 优先使用自定义方案
  if (classData.custom_plan_id) {
    return findPlanById(classData.custom_plan_id)
  }

  // 其次按专业匹配
  if (classData.major_id) {
    const planByMajor = findPlanByMajor(classData.major_id)
    if (planByMajor) return planByMajor
  }

  // 最后按层次匹配
  if (classData.training_level_id) {
    return findPlanByLevel(classData.training_level_id)
  }

  return null
}
```

#### 3.2.2 方案课程矩阵 (`CourseMatrix.vue`) ⭐核心交互组件

**可视化布局**：
- **行**：课程（按类型分组：公共基础课、专业课）
- **列**：学期（第1学期 ~ 第N学期，N由最大学期数决定）
- **单元格**：周课时（0/2/4/6/8等数值）

**颜色编码**：
- 白色：0课时
- 浅蓝色：≤2课时
- 中蓝色：≤4课时
- 深蓝色：>4课时

**单元格交互**：
1. 点击单元格打开Popover编辑框
2. 选择周课时（下拉选项：0, 2, 4, 6, 8）
3. 可选择关联教材（周课时为0时不可选）
4. 实时显示学期总课时（周课时 × 周数）

**学期范围设置**：
- 通过对话框设置课程的起始学期和结束学期
- 例如：某课程设置开课范围为第1~4学期
- 系统自动为该课程在第1、2、3、4学期各创建一个学期明细记录

**统一学期周数**：
- 底部控制栏可一键设置所有学期的周数（默认18周）
- 支持单个学期单独调整周数

**排序功能**：
- 每个分组内支持上移/下移调整课程顺序
- 排序影响方案展示和导出时的顺序

**小计统计**：
- 每学期小计课时（该学期所有课程课时之和）
- 每组总课时（公共课组总课时、专业课组总课时）
- 方案总课时（所有课程所有学期课时之和）

**数据结构（三层嵌套）**：
```
TrainingPlan (培养方案)
  └─ PlanCourse[] (方案课程)
      ├─ id, plan_id, course_id
      ├─ start_semester, end_semester (开课范围)
      ├─ weekly_hours, weeks_per_semester (默认值)
      ├─ sort_order (排序)
      └─ PlanCourseSemester[] (学期明细)
          ├─ id, plan_course_id, semester
          ├─ weekly_hours (该学期周课时)
          ├─ weeks_count (该学期周数)
          └─ PlanTextbook[] (教材关联)
              └─ Textbook (教材)
```

**事务一致性保障**：
添加/修改课程时，使用Prisma事务确保：
1. 创建/更新 `PlanCourse`
2. 自动创建/同步对应学期的 `PlanCourseSemester` 记录
3. 失败时自动回滚

**关键API**：
```javascript
POST   /api/plans/:id/courses                 添加课程到方案
PUT    /api/plans/courses/:id                 更新方案课程
DELETE /api/plans/courses/:id                 删除方案课程
POST   /api/plans/:planId/courses/:courseId/semesters  创建/更新学期明细
PUT    /api/plans/semesters/:id               更新学期明细
POST   /api/plans/semesters/:id/textbooks     关联教材到学期
```

#### 3.2.3 业务流程

**用户操作流程**：
```
1. 进入培养方案详情页
2. 点击"添加课程"，选择课程并设置开课范围（如第1~4学期）
3. 系统自动创建 PlanCourse 和对应的 PlanCourseSemester 记录
4. 在矩阵表格中点击单元格，设置该学期周课时
5. 可选：为该学期关联教材
6. 点击"设置学期"按钮，调整课程的开课范围
7. 使用底部"学期周数"统一设置所有学期的周数
8. 使用上移/下移调整课程顺序
9. 保存方案
```

**后端处理流程**：
```javascript
// POST /api/plans/:id/courses
async function addCourseToPlan(req, res) {
  const { id: planId } = req.params
  const { courseId, startSemester, endSemester, weeklyHours } = req.body

  await prisma.$transaction(async (tx) => {
    // 1. 创建 PlanCourse
    const planCourse = await tx.planCourse.create({
      data: {
        planId,
        courseId,
        startSemester,
        endSemester,
        weeklyHours,
        weeksPerSemester: 18
      }
    })

    // 2. 为每个学期创建 PlanCourseSemester
    for (let s = startSemester; s <= endSemester; s++) {
      await tx.planCourseSemester.create({
        data: {
          planCourseId: planCourse.id,
          semester: s,
          weeklyHours,
          weeksCount: 18
        }
      })
    }
  })

  success(res, '添加成功')
}
```

---

### 3.3 查询报表模块

#### 3.3.1 当前学期开课查询 (`/query/semester`) ⭐核心查询

**功能描述**：查询所有班级在当前学期的开课情况

**筛选条件**：学院、专业、培养层次、入学年份、年级

**展示内容**：
- **班级信息**：名称、学院、专业、层次、入学年份、年级、人数
- **课程列表**：课程名、类型、周课时、学期总课时、使用教材
- **统计数据**：开课数、周课时合计

**交互特性**：
- 展开详情：点击班级可展开查看该班级本学期所有课程及教材
- Excel导出：导出完整的开课情况报表

**查询逻辑**：
```javascript
// GET /api/query/semester
async function querySemesterCourses(req, res) {
  // Step 1: 获取当前学期配置
  const currentSemester = await getSetting('current_semester')
  // 解析： "2025-2026-2" → startYear=2025, semesterIndex=2

  // Step 2: 查询所有在读班级（status='active'）
  const classes = await prisma.class.findMany({
    where: { status: 'active' },
    include: { major, college, trainingLevel, customPlan }
  })

  // Step 3: 预加载培养方案（优化性能，避免N+1查询）
  const planIds = classes.map(c => c.customPlanId || c.majorId || c.trainingLevelId).filter(Boolean)
  const plans = await prisma.trainingPlan.findMany({
    where: { id: { in: planIds } },
    include: {
      courses: {
        include: {
          course: true,
          semesters: {
            include: { textbooks: { include: { textbook: true } } }
          }
        }
      }
    }
  })

  // Step 4: 对每个班级进行匹配
  const result = []
  for (const cls of classes) {
    // 计算当前年级和学期序号
    const grade = startYear - cls.enrollmentYear + 1
    const currentSemesterNum = (grade - 1) * 2 + semesterIndex

    // 检查是否超出学制范围
    if (currentSemesterNum > cls.durationYears * 2) continue

    // 找到匹配的培养方案
    const plan = findMatchingPlan(cls, plans)
    if (!plan) continue

    // 过滤出在该学期开课的课程
    const courses = plan.courses.filter(pc =>
      pc.startSemester <= currentSemesterNum &&
      pc.endSemester >= currentSemesterNum
    )

    // 提取课程信息和教材
    const courseList = courses.map(pc => {
      const semester = pc.semesters.find(s => s.semester === currentSemesterNum)
      return {
        courseName: pc.course.name,
        courseType: pc.course.type,
        weeklyHours: semester?.weeklyHours || 0,
        totalHours: (semester?.weeklyHours || 0) * (semester?.weeksCount || 18),
        textbooks: semester?.textbooks.map(pt => pt.textbook) || []
      }
    })

    result.push({
      className: cls.name,
      majorName: cls.major?.name,
      collegeName: cls.college?.name,
      levelName: cls.trainingLevel?.name,
      enrollmentYear: cls.enrollmentYear,
      grade,
      currentSemester: currentSemesterNum,
      studentCount: cls.studentCount,
      courses: courseList
    })
  }

  // Step 5: 组装返回数据
  success(res, {
    semesterInfo: {
      label: `${endYear}年春季(第${semesterIndex}学期)`,
      startYear,
      endYear,
      semesterIndex
    },
    totalClasses: result.length,
    data: result
  })
}
```

#### 3.3.2 培养方案查询 (`/query/plan`)

**功能描述**：查看培养方案的完整课程设置

**展示方式**：方案信息 + 课程矩阵（类似编辑界面但只读）

**应用场景**：快速浏览某个培养方案的全部课程安排

#### 3.3.3 教材使用查询 (`/query/textbook`)

**功能描述**：查询某教材被哪些班级使用

**展示内容**：
- **教材信息**：书名、ISBN、出版社、作者
- **使用班级列表**：班级名、专业、层次、人数、年级、学期、课程名
- **统计**：使用班级数、学生总人数

**概览模式**：查看所有教材的使用情况汇总

**查询逻辑**：
```javascript
// GET /api/query/textbook/:id
async function queryTextbookUsage(req, res) {
  const { id } = req.params

  // Step 1: 查找该教材在所有 plan_textbooks 中的记录
  const textbookUsages = await prisma.planTextbook.findMany({
    where: { textbookId: id },
    include: {
      semester: {
        include: {
          planCourse: {
            include: {
              plan: true,
              course: true
            }
          }
        }
      }
    }
  })

  // Step 2: 反查使用该培养方案的所有班级
  const usingClasses = []
  for (const usage of textbookUsages) {
    const plan = usage.semester.planCourse.plan
    const semesterNum = usage.semester.semester

    // 查找使用该方案的班级
    const classes = await prisma.class.findMany({
      where: {
        OR: [
          { customPlanId: plan.id },
          { majorId: plan.majorId, customPlanId: null },
          { trainingLevelId: plan.trainingLevelId, customPlanId: null }
        ],
        status: 'active'
      },
      include: { major, college, trainingLevel }
    })

    // 验证班级当前学期是否在教材使用学期范围内
    for (const cls of classes) {
      const grade = startYear - cls.enrollmentYear + 1
      const currentSemesterNum = (grade - 1) * 2 + semesterIndex

      if (currentSemesterNum === semesterNum) {
        usingClasses.push({
          className: cls.name,
          majorName: cls.major?.name,
          levelName: cls.trainingLevel?.name,
          studentCount: cls.studentCount,
          grade,
          semester: semesterNum,
          courseName: usage.semester.planCourse.course.name
        })
      }
    }
  }

  // Step 3: 汇总统计
  success(res, {
    textbook: textbookInfo,
    usingClasses,
    totalClasses: usingClasses.length,
    totalStudents: usingClasses.reduce((sum, c) => sum + c.studentCount, 0)
  })
}
```

---

### 3.4 系统设置 (`/settings`)

#### 3.4.1 当前学期配置

**设置项**：选择当前学期（格式：YYYY-YYYY-N，如 2025-2026-2）

**作用**：
- 自动计算班级年级和学期
- 确定培养方案中哪些课程在当前学期开课
- 查询和导出当前学期的开课情况

**提示**：建议每学期开始时更新此设置

**存储方式**：SQLite `system_settings` 表
```sql
INSERT INTO system_settings (key, value, description)
VALUES ('current_semester', '2025-2026-2', '当前学期');
```

#### 3.4.2 数据重置功能 ⚠️危险操作

**清空范围**：
- 基础数据：班级、课程、教材、专业、学院、层次
- 培养方案：方案及所有课程安排和教材关联
- 系统设置：清空所有设置项

**安全措施**：
1. 二次确认弹窗
2. 需输入确认文字（如"清空班级"）
3. 显示级联影响说明
4. 记录操作日志

**重置模块**：
- `majors`：专业
- `colleges`：学院
- `levels`：培养层次
- `courses`：课程（同时清空培养方案中的课程安排）
- `textbooks`：教材（同时清空培养方案中的教材关联）
- `classes`：班级
- `plans`：培养方案
- `settings`：系统设置

**安全检查**：
```javascript
// 重置专业/学院/层次前检查是否存在班级
if (module === 'majors' || module === 'colleges' || module === 'levels') {
  const classCount = await prisma.class.count()
  if (classCount > 0) {
    return fail(res, '存在班级数据，无法重置基础数据。请先重置班级。')
  }
}
```

#### 3.4.3 帮助说明区

**学期设置说明**：解释当前学期的作用和更新时机

**重置说明**：
- 操作风险
- 前置条件
- 推荐顺序
- 级联影响
- 操作日志

---

### 3.5 操作日志 (`/audit-logs`)

**功能描述**：记录和查询系统操作历史

**记录内容**：
- `action`: 操作类型（import, export, create, update, delete）
- `module`: 模块（class, course, textbook, major, college, trainingPlan, system）
- `operator`: 操作人（当前为空，预留字段）
- `ip`: IP地址（当前为空，预留字段）
- `details`: 操作详情（JSON格式）
- `result`: 结果（success, failed）
- `message`: 消息
- `created_at`: 时间戳

**应用场景**：
- 导入/导出操作记录
- 数据重置操作记录
- 便于追溯问题

**日志记录示例**：
```javascript
// 导入班级后记录日志
await prisma.auditLog.create({
  data: {
    action: 'import',
    module: 'class',
    details: {
      rowCount: 50,
      imported: 48,
      skipped: 2,
      errors: ['第3行：缺少必填字段', '第15行：班级名称已存在']
    },
    result: 'success',
    message: '导入班级48个，跳过2个'
  }
})
```

---

### 3.6 Excel导入导出

#### 3.6.1 批量导入

**支持模块**：班级、课程、教材

**导入流程**：
```
1. 下载标准模板
   - 前端提供模板下载按钮
   - 后端生成包含示例行的Excel文件

2. 填写数据
   - 用户按照模板格式填写
   - 参考示例行理解字段含义

3. 上传Excel文件
   - 前端FileInput组件选择文件
   - 选择冲突处理策略（跳过/覆盖）

4. 服务端解析并校验
   - Multer接收文件
   - ExcelJS读取工作簿
   - 逐行解析数据

5. 返回导入结果
   - 成功数
   - 跳过数
   - 覆盖数
   - 错误信息数组
```

**冲突处理策略**：
- **跳过**：如果记录已存在，则跳过不处理
- **覆盖**：如果记录已存在，则更新现有记录

**智能创建机制**（班级导入）：
```javascript
// 导入班级时自动创建缺失的基础数据
for (const row of rows) {
  // 查找或创建培养层次
  let level = await prisma.trainingLevel.findFirst({
    where: { name: row['培养层次'] }
  })
  if (!level) {
    level = await prisma.trainingLevel.create({
      data: {
        name: row['培养层次'],
        code: generateCode(row['培养层次']),
        sortOrder: 0
      }
    })
  }

  // 查找或创建学院
  let college = await prisma.college.findFirst({
    where: { name: row['学院'] }
  })
  if (!college) {
    college = await prisma.college.create({
      data: {
        name: row['学院'],
        code: generateCode(row['学院']),
        sortOrder: 0
      }
    })
  }

  // 查找或创建专业
  let major = await prisma.major.findFirst({
    where: { name: row['专业'] }
  })
  if (!major) {
    major = await prisma.major.create({
      data: {
        name: row['专业'],
        code: generateCode(row['专业']),
        sortOrder: 0
      }
    })
  }

  // 创建班级
  await prisma.class.create({
    data: {
      name: row['班级名称'],
      enrollmentYear: parseInt(row['入学年份']),
      durationYears: parseInt(row['学制']),
      studentCount: parseInt(row['人数']),
      majorId: major.id,
      collegeId: college.id,
      trainingLevelId: level.id
    }
  })
}
```

#### 3.6.2 数据导出

**导出类型**：
1. 当前学期开课情况（按班级维度）
2. 教材使用情况（按教材维度）
3. 导入模板下载

**导出格式**：`.xlsx`（UTF-8编码文件名）

**实现方式**：服务端生成Excel Buffer，直接返回二进制流

**导出逻辑示例**（当前学期开课情况）：
```javascript
// GET /api/export/semester
async function exportSemesterCourses(req, res) {
  // 1. 查询数据（同 /api/query/semester）
  const data = await querySemesterCourses()

  // 2. 创建工作簿
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('开课情况')

  // 3. 设置表头
  worksheet.columns = [
    { header: '班级', key: 'className' },
    { header: '专业', key: 'majorName' },
    { header: '学院', key: 'collegeName' },
    { header: '年级', key: 'grade' },
    { header: '学期', key: 'currentSemester' },
    { header: '课程', key: 'courseName' },
    { header: '类型', key: 'courseType' },
    { header: '周课时', key: 'weeklyHours' },
    { header: '总课时', key: 'totalHours' },
    { header: '教材', key: 'textbook' }
  ]

  // 4. 填充数据
  for (const cls of data.data) {
    for (const course of cls.courses) {
      worksheet.addRow({
        className: cls.className,
        majorName: cls.majorName,
        collegeName: cls.collegeName,
        grade: cls.grade,
        currentSemester: cls.currentSemester,
        courseName: course.courseName,
        courseType: course.courseType,
        weeklyHours: course.weeklyHours,
        totalHours: course.totalHours,
        textbook: course.textbooks.map(t => t.title).join(', ')
      })
    }
  }

  // 5. 返回Excel文件
  const buffer = await workbook.xlsx.writeBuffer()
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="开课情况_${new Date().toISOString().slice(0, 10)}.xlsx"`)
  res.send(buffer)
}
```

---

## 四、数据模型分析

### 4.1 ER关系图

```
┌─────────────┐       ┌──────────────────┐
│   Major     │1     N│ TrainingPlan     │
│  (专业)      │───────│  (培养方案)       │
└─────────────┘       └────────┬─────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐       ┌──────▼──────┐
              │College    │       │TrainingLevel│
              │(学院)      │       │(培养层次)    │
              └───────────┘       └─────────────┘
                    │                     │
                    └──────────┬──────────┘
                               │1
                    ┌──────────▼──────────┐
                    │      Class          │
                    │     (班级)           │
                    └─────────────────────┘

┌─────────────┐       ┌──────────────────┐
│   Course    │1     N│  PlanCourse      │
│  (课程)      │───────│ (方案课程)        │
└─────────────┘       └────────┬─────────┘
                               │1
                    ┌──────────▼──────────┐
                    │PlanCourseSemester   │
                    │  (学期明细)          │
                    └────────┬────────────┘
                             │1
                    ┌────────▼────────────┐
                    │  PlanTextbook       │
                    │  (教材关联)          │
                    └────────┬────────────┘
                             │N
                    ┌────────▼────────────┐
                    │   Textbook          │
                    │   (教材)             │
                    └─────────────────────┘

┌─────────────┐
│SystemSetting│
│(系统设置)    │
└─────────────┘

┌─────────────┐
│  AuditLog   │
│ (操作日志)   │
└─────────────┘
```

### 4.2 核心表结构详解

#### 4.2.1 基础数据表

| 表名 | 说明 | 关键字段 | 约束 |
|------|------|---------|------|
| `majors` | 专业类别 | id, name, code, description, sort_order | - |
| `colleges` | 二级学院 | id, name(唯一), code, description, sort_order | UNIQUE(name) |
| `training_levels` | 培养层次 | id, name(唯一), code, description, sort_order | UNIQUE(name) |
| `courses` | 课程 | id, name, code, type(public/professional), description | - |
| `textbooks` | 教材 | id, title, isbn, publisher, author, edition, publish_date, price, category, is_active | - |

#### 4.2.2 核心业务表

| 表名 | 说明 | 关键字段 | 外键 | 约束 |
|------|------|---------|------|------|
| `training_plans` | 培养方案 | id, name, major_id?, college_id?, training_level_id?, version, description | major→majors, college→colleges, level→training_levels | CHECK: major_id XOR training_level_id |
| `plan_courses` | 方案课程 | id, plan_id, course_id, start_semester, end_semester, weekly_hours, weeks_per_semester, sort_order | plan→training_plans(Cascade), course→courses | - |
| `plan_course_semesters` | 学期明细 | id, plan_course_id, semester, weekly_hours, weeks_count | planCourse→plan_courses(Cascade) | UNIQUE(plan_course_id, semester) |
| `plan_textbooks` | 教材关联 | id, semester_id, textbook_id, is_required | semester→plan_course_semesters(Cascade), textbook→textbooks | - |
| `classes` | 班级 | id, name, enrollment_year, duration_years, major_id?, college_id?, training_level_id, student_count, custom_plan_id?, status(active/graduated) | major→majors, college→colleges, level→training_levels, customPlan→training_plans | - |

#### 4.2.3 系统表

| 表名 | 说明 | 关键字段 | 约束 |
|------|------|---------|------|
| `system_settings` | 系统设置 | id, key(唯一), value, description | UNIQUE(key) |
| `audit_logs` | 操作日志 | id, action, module, operator?, ip?, details(JSON), result, message, created_at | - |

### 4.3 关键关系说明

#### 4.3.1 培养方案与班级的关联（多对多间接关联）

**三种关联方式**：
```
方式1：班级.custom_plan_id → TrainingPlan.id (明确指定)
  - 最高优先级
  - 适用于特殊班级需要独立方案的情况

方式2：班级.major_id → TrainingPlan.major_id (按专业匹配)
  - 次优先级
  - 同一专业的班级默认使用同一方案

方式3：班级.training_level_id → TrainingPlan.training_level_id (按层次匹配)
  - 最后优先级
  - 同一培养层次的班级默认使用同一方案

优先级：方式1 > 方式2 = 方式3
注意：方案只能选择专业或层次之一，不能同时选择
```

**匹配逻辑实现**：
```javascript
async function getPlanForClass(classId) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { major, trainingLevel, customPlan: true }
  })

  // 优先使用自定义方案
  if (cls.customPlan) {
    return cls.customPlan
  }

  // 其次按专业匹配
  if (cls.majorId) {
    const planByMajor = await prisma.trainingPlan.findFirst({
      where: { majorId: cls.majorId }
    })
    if (planByMajor) return planByMajor
  }

  // 最后按层次匹配
  if (cls.trainingLevelId) {
    const planByLevel = await prisma.trainingPlan.findFirst({
      where: { trainingLevelId: cls.trainingLevelId }
    })
    if (planByLevel) return planByLevel
  }

  return null
}
```

#### 4.3.2 课程与学期的关系

**层级结构**：
```
PlanCourse (课程在方案中的配置)
  ├─ startSemester ~ endSemester (开课范围，如第1~4学期)
  └─ PlanCourseSemester[] (每个学期的具体配置)
      ├─ semester (学期序号，如1,2,3,4)
      ├─ weeklyHours (该学期周课时)
      └─ weeksCount (该学期周数)
```

**示例**：
- 课程A在方案中配置：开课范围第1~4学期，默认周课时4
- 系统创建4条 `plan_course_semesters` 记录：
  - semester=1, weeklyHours=4, weeksCount=18
  - semester=2, weeklyHours=4, weeksCount=18
  - semester=3, weeklyHours=4, weeksCount=18
  - semester=4, weeklyHours=4, weeksCount=18
- 后续可单独修改某个学期的周课时，如第2学期改为2课时

#### 4.3.3 教材与学期的关系

**一对一关系**：
```
一个学期只能关联一本教材（先删后增策略）

PlanCourseSemester (学期)
  └─ PlanTextbook (教材关联)
      └─ Textbook (教材)
```

**关联逻辑**：
```javascript
// POST /api/plans/semesters/:id/textbooks
async function associateTextbook(req, res) {
  const { semesterId } = req.params
  const { textbookId } = req.body

  await prisma.$transaction(async (tx) => {
    // 1. 删除该学期原有的所有教材关联
    await tx.planTextbook.deleteMany({
      where: { semesterId }
    })

    // 2. 创建新的教材关联
    await tx.planTextbook.create({
      data: {
        semesterId,
        textbookId,
        isRequired: true
      }
    })
  })

  success(res, '关联成功')
}
```

### 4.4 数据库约束

#### 唯一约束
- `training_levels.name`
- `colleges.name`
- `system_settings.key`
- `plan_course_semesters(plan_course_id, semester)` 联合唯一

#### 级联删除
- `plan_courses.plan_id` → Cascade (删除方案时自动删除其课程)
- `plan_course_semesters.plan_course_id` → Cascade
- `plan_textbooks.semester_id` → Cascade

#### 检查约束（建议添加）
```prisma
model TrainingPlan {
  @@check((major_id IS NOT NULL) != (training_level_id IS NOT NULL))
}
```

---

## 五、业务流程详解

### 5.1 班级年级自动推算流程

#### 触发时机
1. 创建班级时
2. 更新班级时（即使未修改入学年份/学制）
3. 查询班级列表时（前端计算展示）

#### 计算步骤
```javascript
Step 1: 从 system_settings 读取 current_semester (如 "2025-2026-2")
Step 2: 解析出 startYear=2025, endYear=2026, semesterIndex=2
Step 3: grade = startYear - enrollmentYear + 1
Step 4: currentSemesterNum = (grade - 1) * 2 + semesterIndex
Step 5: status = (grade <= durationYears) ? 'active' : 'graduated'
```

#### 示例场景推演

**场景1：正常在读**
```
班级A：2024年入学，3年制
当前学期：2025-2026学年 第2学期

grade = 2025 - 2024 + 1 = 2年级
currentSemester = (2-1)*2 + 2 = 第4学期
总学期数 = 3 * 2 = 6学期
第4学期 ≤ 6学期 → status = 'active' (在读)
```

**场景2：最后一学期**
```
班级A：2024年入学，3年制
当前学期：2026-2027学年 第2学期

grade = 2026 - 2024 + 1 = 3年级
currentSemester = (3-1)*2 + 2 = 第6学期
第6学期 ≤ 6学期 → status = 'active' (在读，最后一学期)
```

**场景3：已毕业**
```
班级A：2024年入学，3年制
当前学期：2027-2028学年 第1学期

grade = 2027 - 2024 + 1 = 4年级
4年级 > 3年制 → status = 'graduated' (已毕业)
```

#### 潜在问题与解决方案

**问题**：班级状态更新不及时
- 当前仅在创建/更新时计算状态
- 学期切换后不会自动更新已存在的班级状态

**解决方案**：
1. **方案A**：添加定时任务，每天凌晨自动更新所有班级状态
2. **方案B**：在查询时实时计算状态（牺牲性能换取准确性）
3. **方案C**：在系统设置更新学期时触发批量更新

**推荐**：采用方案C，在 `/api/settings` 更新 `current_semester` 时触发：
```javascript
// PUT /api/settings
async function updateSetting(req, res) {
  const { key, value } = req.body

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })

  // 如果更新的是当前学期，触发班级状态批量更新
  if (key === 'current_semester') {
    await updateAllClassStatuses(value)
  }

  success(res, '更新成功')
}

async function updateAllClassStatuses(currentSemester) {
  const [startYear] = currentSemester.split('-').map(Number)
  const classes = await prisma.class.findMany()

  for (const cls of classes) {
    const grade = startYear - cls.enrollmentYear + 1
    const newStatus = grade <= cls.durationYears ? 'active' : 'graduated'

    if (cls.status !== newStatus) {
      await prisma.class.update({
        where: { id: cls.id },
        data: { status: newStatus }
      })
    }
  }
}
```

---

### 5.2 培养方案课程配置流程

#### 用户操作流程
```
1. 进入培养方案详情页
2. 点击"添加课程"，选择课程并设置开课范围（如第1~4学期）
3. 系统自动创建 PlanCourse 和对应的 PlanCourseSemester 记录
4. 在矩阵表格中点击单元格，设置该学期周课时
5. 可选：为该学期关联教材
6. 点击"设置学期"按钮，调整课程的开课范围
7. 使用底部"学期周数"统一设置所有学期的周数
8. 使用上移/下移调整课程顺序
```

#### 后端处理流程

**添加课程到方案**：
```javascript
// POST /api/plans/:id/courses
async function addCourseToPlan(req, res) {
  const { id: planId } = req.params
  const { courseId, startSemester, endSemester, weeklyHours } = req.body

  await prisma.$transaction(async (tx) => {
    // 1. 创建 PlanCourse
    const planCourse = await tx.planCourse.create({
      data: {
        planId,
        courseId,
        startSemester,
        endSemester,
        weeklyHours,
        weeksPerSemester: 18
      }
    })

    // 2. 循环创建 PlanCourseSemester (for s in start..end)
    for (let s = startSemester; s <= endSemester; s++) {
      await tx.planCourseSemester.create({
        data: {
          planCourseId: planCourse.id,
          semester: s,
          weeklyHours,
          weeksCount: 18
        }
      })
    }
  })

  success(res, '添加成功')
}
```

**更新方案课程**：
```javascript
// PUT /api/plans/courses/:id
async function updatePlanCourse(req, res) {
  const { id } = req.params
  const { startSemester, endSemester, weeklyHours, ...otherData } = req.body

  await prisma.$transaction(async (tx) => {
    // 1. 更新 PlanCourse
    await tx.planCourse.update({
      where: { id },
      data: { startSemester, endSemester, weeklyHours, ...otherData }
    })

    // 2. 删除所有旧的 PlanCourseSemester
    await tx.planCourseSemester.deleteMany({
      where: { planCourseId: id }
    })

    // 3. 重新创建新的 PlanCourseSemester (保持数据一致性)
    for (let s = startSemester; s <= endSemester; s++) {
      await tx.planCourseSemester.create({
        data: {
          planCourseId: id,
          semester: s,
          weeklyHours,
          weeksCount: 18
        }
      })
    }
  })

  success(res, '更新成功')
}
```

**Upsert学期明细**：
```javascript
// POST /api/plans/:planId/courses/:courseId/semesters
async function upsertSemester(req, res) {
  const { planId, courseId } = req.params
  const { semester, weeklyHours, weeksCount } = req.body

  // 查找或创建 PlanCourse
  let planCourse = await prisma.planCourse.findFirst({
    where: { planId, courseId }
  })

  if (!planCourse) {
    planCourse = await prisma.planCourse.create({
      data: {
        planId,
        courseId,
        startSemester: semester,
        endSemester: semester,
        weeklyHours,
        weeksPerSemester: weeksCount || 18
      }
    })
  }

  // Upsert PlanCourseSemester (存在则更新，不存在则创建)
  await prisma.planCourseSemester.upsert({
    where: {
      planCourseId_semester: {
        planCourseId: planCourse.id,
        semester
      }
    },
    update: { weeklyHours, weeksCount },
    create: {
      planCourseId: planCourse.id,
      semester,
      weeklyHours,
      weeksCount: weeksCount || 18
    }
  })

  success(res, '保存成功')
}
```

**关联教材到学期**：
```javascript
// POST /api/plans/semesters/:id/textbooks
async function associateTextbook(req, res) {
  const { semesterId } = req.params
  const { textbookId } = req.body

  await prisma.$transaction(async (tx) => {
    // 1. 删除该学期原有的所有教材关联
    await tx.planTextbook.deleteMany({
      where: { semesterId }
    })

    // 2. 创建新的 PlanTextbook (确保一学期一教材)
    await tx.planTextbook.create({
      data: {
        semesterId,
        textbookId,
        isRequired: true
      }
    })
  })

  success(res, '关联成功')
}
```

---

### 5.3 当前学期开课查询流程

#### 请求示例
```
GET /api/query/semester?majorId=1&collegeId=2&enrollmentYear=2024
```

#### 处理步骤

**Step 1: 获取当前学期配置**
```javascript
const currentSemester = await getSetting('current_semester')
// "2025-2026-2" → startYear=2025, endYear=2026, semesterIndex=2
```

**Step 2: 查询所有在读班级（status='active'）**
```javascript
const classes = await prisma.class.findMany({
  where: {
    status: 'active',
    // 应用筛选条件
    ...(majorId && { majorId }),
    ...(collegeId && { collegeId }),
    ...(trainingLevelId && { trainingLevelId }),
    ...(enrollmentYear && { enrollmentYear })
  },
  include: {
    major: true,
    college: true,
    trainingLevel: true,
    customPlan: true
  }
})
```

**Step 3: 预加载培养方案（优化性能，避免N+1查询）**
```javascript
// 收集所有可能用到的方案ID
const planIds = new Set()
classes.forEach(cls => {
  if (cls.customPlanId) planIds.add(cls.customPlanId)
  if (cls.majorId) planIds.add(`major_${cls.majorId}`)
  if (cls.trainingLevelId) planIds.add(`level_${cls.trainingLevelId}`)
})

// 一次性查询所有相关的 TrainingPlan 及其课程
const plansByMajor = await prisma.trainingPlan.findMany({
  where: { majorId: { in: [...majorIds] } },
  include: {
    courses: {
      include: {
        course: true,
        semesters: {
          include: { textbooks: { include: { textbook: true } } }
        }
      }
    }
  }
})

const plansByLevel = await prisma.trainingPlan.findMany({
  where: { trainingLevelId: { in: [...levelIds] } },
  include: {
    courses: {
      include: {
        course: true,
        semesters: {
          include: { textbooks: { include: { textbook: true } } }
        }
      }
    }
  }
})
```

**Step 4: 对每个班级进行匹配**
```javascript
const result = []

for (const cls of classes) {
  // 计算当前年级和学期序号
  const grade = startYear - cls.enrollmentYear + 1
  const currentSemesterNum = (grade - 1) * 2 + semesterIndex

  // 如果超出学制范围，跳过
  if (currentSemesterNum > cls.durationYears * 2) {
    continue
  }

  // 找到匹配的培养方案
  let plan = null
  if (cls.customPlan) {
    plan = cls.customPlan
  } else if (cls.majorId) {
    plan = plansByMajor.find(p => p.majorId === cls.majorId)
  } else if (cls.trainingLevelId) {
    plan = plansByLevel.find(p => p.trainingLevelId === cls.trainingLevelId)
  }

  if (!plan) continue

  // 过滤出在该学期开课的课程
  const courses = plan.courses.filter(pc =>
    pc.startSemester <= currentSemesterNum &&
    pc.endSemester >= currentSemesterNum
  )

  // 提取每门课程的周课时、教材等信息
  const courseList = courses.map(pc => {
    const semester = pc.semesters.find(s => s.semester === currentSemesterNum)
    return {
      courseName: pc.course.name,
      courseType: pc.course.type,
      weeklyHours: semester?.weeklyHours || 0,
      totalHours: (semester?.weeklyHours || 0) * (semester?.weeksCount || 18),
      textbooks: semester?.textbooks.map(pt => ({
        id: pt.textbook.id,
        title: pt.textbook.title,
        isbn: pt.textbook.isbn,
        publisher: pt.textbook.publisher,
        author: pt.textbook.author
      })) || []
    }
  })

  result.push({
    className: cls.name,
    majorName: cls.major?.name,
    collegeName: cls.college?.name,
    levelName: cls.trainingLevel?.name,
    enrollmentYear: cls.enrollmentYear,
    grade,
    currentSemester: currentSemesterNum,
    studentCount: cls.studentCount,
    courses: courseList,
    totalWeeklyHours: courseList.reduce((sum, c) => sum + c.weeklyHours, 0)
  })
}
```

**Step 5: 组装返回数据**
```javascript
success(res, {
  semesterInfo: {
    label: `${endYear}年春季(第${semesterIndex}学期)`,
    startYear,
    endYear,
    semesterIndex
  },
  totalClasses: result.length,
  data: result
})
```

---

### 5.4 Excel批量导入流程（以班级为例）

#### 请求示例
```
POST /api/import/classes
File: classes.xlsx
Body: { onDuplicate: 'skip' | 'overwrite' }
```

#### 处理步骤

**Step 1: 文件上传与校验**
```javascript
// Multer中间件接收文件
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持Excel文件格式'))
    }
  }
})
```

**Step 2: 读取Excel**
```javascript
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(filePath)
const worksheet = workbook.getWorksheet(1)

// 提取表头作为字段名
const headers = []
worksheet.getRow(1).eachCell(cell => {
  headers.push(cell.value)
})

// 逐行解析数据（跳过空行）
const rows = []
worksheet.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return // 跳过表头

  const rowData = {}
  row.eachCell((cell, colNumber) => {
    rowData[headers[colNumber - 1]] = cell.value
  })

  // 跳过空行
  if (Object.values(rowData).every(v => !v)) return

  rows.push(rowData)
})
```

**Step 3: 预加载基础数据**
```javascript
// 查询所有 majors → 建立 name→id 映射
const majors = await prisma.major.findMany()
const majorMap = new Map(majors.map(m => [m.name, m.id]))

// 查询所有 training_levels → 建立 name→id 映射
const levels = await prisma.trainingLevel.findMany()
const levelMap = new Map(levels.map(l => [l.name, l.id]))

// 查询所有 colleges → 建立 name→id 映射
const colleges = await prisma.college.findMany()
const collegeMap = new Map(colleges.map(c => [c.name, c.id]))
```

**Step 4: 逐行处理**
```javascript
const results = {
  imported: 0,
  skipped: 0,
  overwritten: 0,
  errors: []
}

for (let i = 0; i < rows.length; i++) {
  const row = rows[i]
  const rowNum = i + 2 // Excel行号（从2开始，因为第1行是表头）

  try {
    // 校验必填字段
    if (!row['班级名称'] || !row['入学年份'] || !row['学制'] || !row['培养层次']) {
      results.errors.push(`第${rowNum}行：缺少必填字段`)
      continue
    }

    // 查找或自动创建培养层次
    let levelId = levelMap.get(row['培养层次'])
    if (!levelId) {
      const newLevel = await prisma.trainingLevel.create({
        data: {
          name: row['培养层次'],
          code: generateCode(row['培养层次']),
          sortOrder: 0
        }
      })
      levelId = newLevel.id
      levelMap.set(row['培养层次'], levelId)
    }

    // 查找或自动创建学院
    let collegeId = null
    if (row['学院']) {
      collegeId = collegeMap.get(row['学院'])
      if (!collegeId) {
        const newCollege = await prisma.college.create({
          data: {
            name: row['学院'],
            code: generateCode(row['学院']),
            sortOrder: 0
          }
        })
        collegeId = newCollege.id
        collegeMap.set(row['学院'], collegeId)
      }
    }

    // 查找或自动创建专业
    let majorId = null
    if (row['专业']) {
      majorId = majorMap.get(row['专业'])
      if (!majorId) {
        const newMajor = await prisma.major.create({
          data: {
            name: row['专业'],
            code: generateCode(row['专业']),
            sortOrder: 0
          }
        })
        majorId = newMajor.id
        majorMap.set(row['专业'], majorId)
      }
    }

    // 检查是否已存在同名班级
    const existingClass = await prisma.class.findFirst({
      where: { name: row['班级名称'] }
    })

    if (existingClass) {
      if (onDuplicate === 'skip') {
        results.skipped++
        continue
      } else if (onDuplicate === 'overwrite') {
        // 更新现有班级
        await prisma.class.update({
          where: { id: existingClass.id },
          data: {
            enrollmentYear: parseInt(row['入学年份']),
            durationYears: parseInt(row['学制']),
            studentCount: parseInt(row['人数']),
            majorId,
            collegeId,
            trainingLevelId: levelId
          }
        })
        results.overwritten++
        continue
      }
    }

    // 创建新班级
    await prisma.class.create({
      data: {
        name: row['班级名称'],
        enrollmentYear: parseInt(row['入学年份']),
        durationYears: parseInt(row['学制']),
        studentCount: parseInt(row['人数']),
        majorId,
        collegeId,
        trainingLevelId: levelId
      }
    })

    results.imported++
  } catch (error) {
    results.errors.push(`第${rowNum}行：${error.message}`)
  }
}
```

**Step 5: 清理临时文件**
```javascript
fs.unlink(filePath, (err) => {
  if (err) console.error('删除临时文件失败:', err)
})
```

**Step 6: 返回结果**
```javascript
success(res, results)
// {
//   imported: 48,
//   skipped: 2,
//   overwritten: 0,
//   errors: ["第3行：缺少必填字段", "第15行：班级名称已存在"]
// }
```

**Step 7: 记录审计日志**
```javascript
await prisma.auditLog.create({
  data: {
    action: 'import',
    module: 'class',
    details: results,
    result: results.errors.length > 0 ? 'partial_success' : 'success',
    message: `导入班级${results.imported}个，跳过${results.skipped}个`
  }
})
```

---

### 5.5 数据重置流程

#### 请求示例
```
POST /api/settings/reset/classes
Body: { confirmText: "清空班级" }
```

#### 处理步骤

**Step 1: 权限校验（当前无认证，预留）**
```javascript
// TODO: 添加管理员权限校验
// if (!req.user.isAdmin) {
//   return fail(res, '无权操作', 403)
// }
```

**Step 2: 执行删除**
```javascript
const { module } = req.params

switch (module) {
  case 'majors':
  case 'colleges':
  case 'levels':
    // 检查是否存在班级数据
    const classCount = await prisma.class.count()
    if (classCount > 0) {
      return fail(res, '存在班级数据，无法重置基础数据。请先重置班级。')
    }
    await prisma[module].deleteMany()
    break

  case 'courses':
    // 同时清空培养方案中的课程安排（级联删除）
    await prisma.course.deleteMany()
    // plan_courses 会级联删除 plan_course_semesters 和 plan_textbooks
    break

  case 'textbooks':
    // 同时清空培养方案中的教材关联（级联删除）
    await prisma.textbook.deleteMany()
    break

  case 'classes':
    await prisma.class.deleteMany()
    break

  case 'plans':
    await prisma.trainingPlan.deleteMany()
    break

  case 'settings':
    await prisma.systemSetting.deleteMany()
    break

  default:
    return fail(res, '不支持的模块')
}
```

**Step 3: 记录审计日志**
```javascript
await prisma.auditLog.create({
  data: {
    action: 'delete',
    module,
    result: 'success',
    message: `重置${module}成功`
  }
})
```

**Step 4: 返回结果**
```javascript
success(res, { message: '重置成功' })
```

---

## 六、API接口设计

### 6.1 RESTful API规范

#### 统一响应格式

**成功响应**：
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**分页响应**：
```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

**失败响应**：
```json
{
  "success": false,
  "message": "错误信息"
}
```

#### 通用HTTP状态码
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权（未来扩展）
- `403`: 禁止访问（未来扩展）
- `404`: 资源不存在
- `500`: 服务器内部错误

### 6.2 核心API接口清单

#### 基础数据API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/majors` | 专业列表 | - | `{ data: [...] }` |
| POST | `/api/majors` | 创建专业 | `{ name, code, description }` | `{ data: {...} }` |
| PUT | `/api/majors/:id` | 更新专业 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/majors/:id` | 删除专业 | - | `{ message: '删除成功' }` |
| GET | `/api/colleges` | 学院列表 | - | `{ data: [...] }` |
| POST | `/api/colleges` | 创建学院 | `{ name, code, description }` | `{ data: {...} }` |
| PUT | `/api/colleges/:id` | 更新学院 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/colleges/:id` | 删除学院 | - | `{ message: '删除成功' }` |
| GET | `/api/training-levels` | 培养层次列表 | - | `{ data: [...] }` |
| POST | `/api/training-levels` | 创建层次 | `{ name, code, description }` | `{ data: {...} }` |
| PUT | `/api/training-levels/:id` | 更新层次 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/training-levels/:id` | 删除层次 | - | `{ message: '删除成功' }` |

#### 课程与教材API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/courses` | 课程列表（支持分页） | `?page=1&pageSize=20&type=public` | `{ data: { list, total, page, pageSize } }` |
| POST | `/api/courses` | 创建课程 | `{ name, code, type, description }` | `{ data: {...} }` |
| PUT | `/api/courses/:id` | 更新课程 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/courses/:id` | 删除课程 | - | `{ message: '删除成功' }` |
| GET | `/api/textbooks` | 教材列表（支持分页、搜索） | `?page=1&keyword=xxx` | `{ data: { list, total, page, pageSize } }` |
| POST | `/api/textbooks` | 创建教材 | `{ title, isbn, ... }` | `{ data: {...} }` |
| PUT | `/api/textbooks/:id` | 更新教材 | `{ title, ... }` | `{ data: {...} }` |
| DELETE | `/api/textbooks/:id` | 删除教材 | - | `{ message: '删除成功' }` |

#### 班级管理API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/classes` | 班级列表（支持分页、多条件筛选） | `?page=1&majorId=1&status=active` | `{ data: { list, total, page, pageSize } }` |
| POST | `/api/classes` | 创建班级 | `{ name, enrollment_year, ... }` | `{ data: {...} }` |
| PUT | `/api/classes/:id` | 更新班级 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/classes/:id` | 删除班级 | - | `{ message: '删除成功' }` |
| POST | `/api/classes/batch-delete` | 批量删除班级 | `{ ids: [1,2,3] }` | `{ message: '删除成功' }` |
| POST | `/api/classes/batch-update` | 批量更新班级 | `{ ids: [...], field: 'majorId', value: 1 }` | `{ message: '更新成功' }` |

#### 培养方案API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/plans` | 培养方案列表 | - | `{ data: [...] }` |
| POST | `/api/plans` | 创建方案 | `{ name, majorId, ... }` | `{ data: {...} }` |
| PUT | `/api/plans/:id` | 更新方案 | `{ name, ... }` | `{ data: {...} }` |
| DELETE | `/api/plans/:id` | 删除方案 | - | `{ message: '删除成功' }` |
| GET | `/api/plans/:id/courses` | 获取方案课程列表 | - | `{ data: [...] }` |
| POST | `/api/plans/:id/courses` | 添加课程到方案 | `{ courseId, startSemester, endSemester }` | `{ data: {...} }` |
| PUT | `/api/plans/courses/:id` | 更新方案课程 | `{ startSemester, ... }` | `{ data: {...} }` |
| DELETE | `/api/plans/courses/:id` | 删除方案课程 | - | `{ message: '删除成功' }` |
| POST | `/api/plans/:planId/courses/:courseId/semesters` | 创建/更新学期明细（upsert） | `{ semester, weeklyHours, weeksCount }` | `{ data: {...} }` |
| PUT | `/api/plans/semesters/:id` | 更新学期明细 | `{ weeklyHours, weeksCount }` | `{ data: {...} }` |
| GET | `/api/plans/:id/semesters` | 获取方案所有学期周数设置 | - | `{ data: [...] }` |
| POST | `/api/plans/semesters/:id/textbooks` | 关联教材到学期 | `{ textbookId }` | `{ data: {...} }` |
| DELETE | `/api/plans/semesters/:id/textbooks` | 取消学期教材关联 | - | `{ message: '取消成功' }` |
| DELETE | `/api/plans/textbooks/:id` | 删除教材关联 | - | `{ message: '删除成功' }` |

#### 查询API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/query/semester` | 当前学期开课查询 | `?majorId=1&collegeId=2` | `{ data: { semesterInfo, totalClasses, data } }` |
| GET | `/api/query/textbook/:id` | 教材使用情况查询 | - | `{ data: { textbook, usingClasses, totalClasses, totalStudents } }` |
| GET | `/api/query/textbooks` | 所有教材使用情况概览 | - | `{ data: [...] }` |

#### 导入导出API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/import/classes` | 批量导入班级 | File + `{ onDuplicate: 'skip' }` | `{ data: { imported, skipped, errors } }` |
| POST | `/api/import/courses` | 批量导入课程 | File + `{ onDuplicate: 'skip' }` | `{ data: { imported, skipped, errors } }` |
| POST | `/api/import/textbooks` | 批量导入教材 | File + `{ onDuplicate: 'skip' }` | `{ data: { imported, skipped, errors } }` |
| GET | `/api/export/semester` | 导出当前学期开课情况 | - | Excel文件流 |
| GET | `/api/export/textbook/:id` | 导出教材使用情况 | - | Excel文件流 |
| GET | `/api/export/template/:type` | 下载导入模板 (classes/courses/textbooks) | - | Excel文件流 |

#### 系统设置API

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/settings` | 获取系统设置 | - | `{ data: { current_semester: {...} } }` |
| PUT | `/api/settings` | 更新系统设置 | `{ key: 'current_semester', value: '2025-2026-2' }` | `{ message: '更新成功' }` |
| POST | `/api/settings/reset/:module` | 重置指定模块数据 | `{ confirmText: "清空班级" }` | `{ message: '重置成功' }` |
| GET | `/api/audit/logs` | 获取操作日志（分页、筛选） | `?page=1&action=import` | `{ data: { list, total, page, pageSize } }` |

---

## 七、前端架构分析

### 7.1 路由结构

```javascript
// client/src/router/index.js
const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '首页概览' } },
      { path: 'majors', name: 'Majors', component: () => import('@/views/Majors.vue'), meta: { title: '专业管理' } },
      { path: 'colleges', name: 'Colleges', component: () => import('@/views/Colleges.vue'), meta: { title: '学院管理' } },
      { path: 'training-levels', name: 'TrainingLevels', component: () => import('@/views/TrainingLevels.vue'), meta: { title: '培养层次' } },
      { path: 'courses', name: 'Courses', component: () => import('@/views/Courses.vue'), meta: { title: '课程管理' } },
      { path: 'textbooks', name: 'Textbooks', component: () => import('@/views/Textbooks.vue'), meta: { title: '教材管理' } },
      { path: 'classes', name: 'Classes', component: () => import('@/views/Classes.vue'), meta: { title: '班级管理' } },
      { path: 'plans', name: 'Plans', component: () => import('@/views/Plans.vue'), meta: { title: '培养方案' } },
      { path: 'plans/:id', name: 'PlanDetail', component: () => import('@/views/PlanDetail.vue'), meta: { title: '方案详情' } },
      { path: 'query/semester', name: 'QuerySemester', component: () => import('@/views/QuerySemester.vue'), meta: { title: '当前学期开课' } },
      { path: 'query/plan', name: 'QueryPlan', component: () => import('@/views/QueryPlan.vue'), meta: { title: '培养方案查询' } },
      { path: 'query/textbook', name: 'QueryTextbook', component: () => import('@/views/QueryTextbook.vue'), meta: { title: '教材使用查询' } },
      { path: 'settings', name: 'Settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置' } },
      { path: 'audit-logs', name: 'AuditLogs', component: () => import('@/views/AuditLogs.vue'), meta: { title: '操作日志' } }
    ]
  }
]
```

### 7.2 状态管理（Pinia）

#### Settings Store
```javascript
// client/src/stores/settings.js
import { defineStore } from 'pinia'
import { getSettings, updateSetting as updateSettingApi } from '@/api/setting'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {},
    semesterLabel: ''
  }),

  actions: {
    async load() {
      const res = await getSettings()
      this.settings = res.data
      this.updateSemesterLabel()
    },

    async save(key, value) {
      await updateSettingApi(key, value)
      await this.load()
    },

    updateSemesterLabel() {
      const cs = this.settings.current_semester
      if (!cs) {
        this.semesterLabel = '未设置'
        return
      }

      const [startYear, endYear, semesterIndex] = cs.value.split('-').map(Number)
      const semesterName = semesterIndex === 1 ? '秋季' : '春季'
      this.semesterLabel = `${endYear}年${semesterName}(第${semesterIndex}学期)`
    }
  }
})
```

#### 使用示例
```javascript
// 在组件中使用
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
onMounted(() => {
  settingsStore.load()
})

// 在模板中显示
{{ settingsStore.semesterLabel }}
```

### 7.3 核心组件

#### Layout.vue - 布局组件

**结构**：
- **左侧导航**：可折叠菜单，分为"基础数据"、"培养方案"、"查询报表"三个分组
- **顶栏**：显示当前页面标题和当前学期标签
- **主内容区**：router-view渲染子路由

**关键代码**：
```vue
<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'">
      <el-menu
        :collapse="isCollapse"
        :default-active="$route.path"
        router
      >
        <el-sub-menu index="basic">
          <template #title>基础数据</template>
          <el-menu-item index="/majors">专业管理</el-menu-item>
          <el-menu-item index="/colleges">学院管理</el-menu-item>
          <!-- ... -->
        </el-sub-menu>

        <el-sub-menu index="plan">
          <template #title>培养方案</template>
          <el-menu-item index="/plans">方案列表</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="query">
          <template #title>查询报表</template>
          <el-menu-item index="/query/semester">当前学期开课</el-menu-item>
          <!-- ... -->
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶栏 -->
      <el-header>
        <h2>{{ $route.meta.title }}</h2>
        <el-tag>{{ settingsStore.semesterLabel }}</el-tag>
      </el-header>

      <!-- 主内容区 -->
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
```

#### CourseMatrix.vue - 课程矩阵编辑器 ⭐核心复杂组件

**Props**：
- `planId`: 方案ID
- `allCourses`: 所有可用课程列表
- `allTextbooks`: 所有可用教材列表

**Emits**：
- `add-course`: 添加课程事件
- `delete-course`: 删除课程事件

**内部状态**：
```javascript
const rawCourses = ref([]) // 原始课程数据
const semesterWeeks = ref([]) // 学期周数数组
const editingCourse = ref(null) // 正在编辑的课程
const editingSemester = ref(null) // 正在编辑的学期
```

**计算属性**：
```javascript
const maxSemester = computed(() => {
  return Math.max(...rawCourses.value.map(c => c.endSemester), 6)
})

const groups = computed(() => {
  const publicCourses = rawCourses.value.filter(c => c.course.type === 'public')
  const professionalCourses = rawCourses.value.filter(c => c.course.type === 'professional')
  return [
    { title: '公共基础课', courses: publicCourses },
    { title: '专业课', courses: professionalCourses }
  ]
})

const totalAllHours = computed(() => {
  return rawCourses.value.reduce((sum, c) => {
    return sum + c.semesters.reduce((s, sem) => s + sem.weeklyHours * sem.weeksCount, 0)
  }, 0)
})
```

**关键方法**：
```javascript
// 加载方案课程数据
async function loadData() {
  const res = await getPlanCourses(props.planId)
  rawCourses.value = res.data
}

// 打开Popover编辑周课时和教材
function openEdit(course, semester) {
  editingCourse.value = course
  editingSemester.value = semester
}

// 批量更新所有学期周数
async function applyGlobalWeeks(weeks) {
  for (const course of rawCourses.value) {
    for (const sem of course.semesters) {
      await updateSemester(sem.id, { weeksCount: weeks })
    }
  }
  await loadData()
}

// 课程排序
async function handleMoveUp(course, group) {
  const index = group.courses.findIndex(c => c.id === course.id)
  if (index === 0) return

  // 交换sort_order
  const prevCourse = group.courses[index - 1]
  await updatePlanCourse(course.id, { sortOrder: prevCourse.sortOrder })
  await updatePlanCourse(prevCourse.id, { sortOrder: course.sortOrder })

  await loadData()
}
```

### 7.4 API封装

#### Request.js - Axios拦截器

```javascript
// client/src/utils/request.js
import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 未来可在此添加Token
    // config.headers.Authorization = `Bearer ${getToken()}`
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    let message = '请求失败'

    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = error.response.data?.message || '未知错误'
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试'
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
```

#### API模块示例

```javascript
// client/src/api/class.js
import request from '@/utils/request'

export function getClassList(params) {
  return request({
    url: '/classes',
    method: 'get',
    params
  })
}

export function createClass(data) {
  return request({
    url: '/classes',
    method: 'post',
    data
  })
}

export function updateClass(id, data) {
  return request({
    url: `/classes/${id}`,
    method: 'put',
    data
  })
}

export function deleteClass(id) {
  return request({
    url: `/classes/${id}`,
    method: 'delete'
  })
}

export function batchDeleteClasses(ids) {
  return request({
    url: '/classes/batch-delete',
    method: 'post',
    data: { ids }
  })
}

export function batchUpdateClasses(ids, field, value) {
  return request({
    url: '/classes/batch-update',
    method: 'post',
    data: { ids, field, value }
  })
}

export function importClasses(file, onDuplicate) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('onDuplicate', onDuplicate)

  return request({
    url: '/import/classes',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
```

### 7.5 Vite代理配置

```javascript
// client/vite.config.js
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
```

**作用**：前端开发时所有 `/api` 请求自动代理到后端服务器，避免跨域问题。

---

## 八、当前存在的问题与优化建议

### 8.1 安全性问题 ⚠️高优先级

#### 问题1：无身份认证和授权

**现状**：
- 系统完全开放，任何人都可以访问和修改数据
- 无登录/注册功能
- 无权限控制

**风险**：
- 数据泄露：敏感教学数据可能被未授权人员访问
- 恶意篡改：任何人可以修改或删除数据
- 误操作：无法区分不同操作人的责任

**建议方案**：

**短期方案（简单快速）**：
1. 添加简单的密码保护（单一管理员密码）
2. 在 `.env` 文件中配置密码
3. 登录时验证密码，成功后签发JWT Token
4. 所有API请求携带Token，中间件验证

**长期方案（完善的RBAC）**：
1. 用户表设计：
   ```prisma
   model User {
     id        Int      @id @default(autoincrement())
     username  String   @unique
     password  String   // bcrypt加密
     role      String   // 'admin' | 'viewer'
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   }
   ```

2. JWT认证中间件：
   ```javascript
   // server/src/middleware/auth.middleware.js
   function authMiddleware(requiredRole) {
     return (req, res, next) => {
       const token = req.headers.authorization?.replace('Bearer ', '')

       if (!token) {
         return fail(res, '未授权', 401)
       }

       try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET)
         req.user = decoded

         if (requiredRole && decoded.role !== requiredRole) {
           return fail(res, '权限不足', 403)
         }

         next()
       } catch (error) {
         return fail(res, 'Token无效', 401)
       }
     }
   }
   ```

3. 角色权限设计：
   - **管理员（admin）**：所有权限，可维护基础信息和培养方案
   - **访客（viewer）**：仅查询权限，只能访问查询页面

4. 路由保护：
   ```javascript
   // 需要管理员权限的路由
   router.post('/api/classes', authMiddleware('admin'), createClass)
   router.put('/api/classes/:id', authMiddleware('admin'), updateClass)
   router.delete('/api/classes/:id', authMiddleware('admin'), deleteClass)

   // 访客也可访问的查询路由
   router.get('/api/query/semester', authMiddleware(), querySemester)
   ```

5. 前端路由守卫：
   ```javascript
   // client/src/router/index.js
   router.beforeEach((to, from, next) => {
     const token = localStorage.getItem('token')
     const userRole = localStorage.getItem('role')

     if (!token) {
       if (to.path !== '/login') {
         next('/login')
       } else {
         next()
       }
       return
     }

     // 访客只能访问查询页面
     if (userRole === 'viewer') {
       const allowedPaths = ['/query/semester', '/query/plan', '/query/textbook']
       if (!allowedPaths.includes(to.path)) {
         next('/query/semester')
         return
       }
     }

     next()
   })
   ```

#### 问题2：无CSRF防护

**现状**：POST/PUT/DELETE请求无CSRF Token验证

**风险**：跨站请求伪造攻击

**建议**：
1. 启用CSRF Token机制（如果使用Cookie存储Token）
2. 或使用SameSite Cookie策略
3. 或使用JWT Token存储在LocalStorage（当前推荐）

#### 问题3：SQL注入风险较低但需注意

**现状**：使用Prisma ORM，大部分场景安全

**风险**：如果使用原生SQL查询可能存在注入

**建议**：
1. 坚持使用Prisma Query API
2. 避免拼接SQL字符串
3. 如必须使用原生SQL，使用参数化查询

---

### 8.2 数据一致性问题

#### 问题4：班级状态更新不及时

**现状**：班级状态仅在创建/更新时计算，学期切换后不会自动更新

**影响**：已毕业班级可能仍显示"在读"

**建议方案**：

**方案A：定时任务（推荐）**
```javascript
// server/src/services/class-status.service.js
import cron from 'node-cron'
import { prisma } from '../lib/prisma.js'

// 每天凌晨2点执行
cron.schedule('0 2 * * *', async () => {
  console.log('开始更新班级状态...')
  await updateAllClassStatuses()
  console.log('班级状态更新完成')
})

async function updateAllClassStatuses() {
  const currentSemester = await prisma.systemSetting.findUnique({
    where: { key: 'current_semester' }
  })

  if (!currentSemester) return

  const [startYear] = currentSemester.value.split('-').map(Number)
  const classes = await prisma.class.findMany()

  for (const cls of classes) {
    const grade = startYear - cls.enrollmentYear + 1
    const newStatus = grade <= cls.durationYears ? 'active' : 'graduated'

    if (cls.status !== newStatus) {
      await prisma.class.update({
        where: { id: cls.id },
        data: { status: newStatus }
      })
      console.log(`班级 ${cls.name} 状态更新为 ${newStatus}`)
    }
  }
}
```

**方案B：在系统设置更新学期时触发**
```javascript
// server/src/routes/setting.routes.js
router.put('/', async (req, res) => {
  const { key, value } = req.body

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })

  // 如果更新的是当前学期，触发班级状态批量更新
  if (key === 'current_semester') {
    await updateAllClassStatuses(value)
  }

  success(res, '更新成功')
})
```

**方案C：查询时实时计算（性能较差）**
```javascript
// 在查询班级列表时实时计算状态
const classes = await prisma.class.findMany()

const classesWithStatus = classes.map(cls => {
  const grade = startYear - cls.enrollmentYear + 1
  const status = grade <= cls.durationYears ? 'active' : 'graduated'
  return { ...cls, status }
})
```

**推荐**：采用方案A + 方案B组合，既保证及时性又保证准确性。

#### 问题5：培养方案删除未检查默认关联

**现状**：删除方案时仅检查 `customPlanId`，未检查是否有班级通过专业/层次默认关联

**影响**：可能导致班级失去默认方案

**建议**：
```javascript
// server/src/routes/plan.routes.js
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const plan = await prisma.trainingPlan.findUnique({
    where: { id }
  })

  if (!plan) {
    return fail(res, '方案不存在', 404)
  }

  // 检查是否有班级自定义使用该方案
  const customClassCount = await prisma.class.count({
    where: { customPlanId: id }
  })

  if (customClassCount > 0) {
    return fail(res, `该方案已被${customClassCount}个班级自定义使用，无法删除`)
  }

  // 检查是否有班级通过专业默认关联
  if (plan.majorId) {
    const defaultClassCount = await prisma.class.count({
      where: {
        majorId: plan.majorId,
        customPlanId: null
      }
    })

    if (defaultClassCount > 0) {
      return fail(res, `该方案已被${defaultClassCount}个班级默认使用（按专业匹配），无法删除`)
    }
  }

  // 检查是否有班级通过层次默认关联
  if (plan.trainingLevelId) {
    const defaultClassCount = await prisma.class.count({
      where: {
        trainingLevelId: plan.trainingLevelId,
        customPlanId: null
      }
    })

    if (defaultClassCount > 0) {
      return fail(res, `该方案已被${defaultClassCount}个班级默认使用（按层次匹配），无法删除`)
    }
  }

  await prisma.trainingPlan.delete({
    where: { id }
  })

  success(res, '删除成功')
})
```

---

### 8.3 性能优化

#### 问题6：N+1查询问题

**现状**：部分接口存在循环查询
- `plan.routes.js` 中为每个方案单独查询班级数量
- `query.routes.js` 中为每个班级匹配方案时可能多次查询

**影响**：数据量大时响应缓慢

**建议**：

**优化1：使用Prisma的 `include` 和聚合查询**
```javascript
// 优化前（N+1查询）
const plans = await prisma.trainingPlan.findMany()
for (const plan of plans) {
  const classCount = await prisma.class.count({
    where: { customPlanId: plan.id }
  })
  plan.classCount = classCount
}

// 优化后（一次性查询）
const plans = await prisma.trainingPlan.findMany({
  include: {
    _count: {
      select: {
        classes: true // 需要在schema中定义反向关系
      }
    }
  }
})
```

**优化2：使用 `Promise.all` 并行查询**
```javascript
// 优化前（串行查询）
for (const cls of classes) {
  const plan = await findPlanForClass(cls.id)
  cls.plan = plan
}

// 优化后（并行查询）
const planPromises = classes.map(cls => findPlanForClass(cls.id))
const plans = await Promise.all(planPromises)
classes.forEach((cls, index) => {
  cls.plan = plans[index]
})
```

**优化3：预加载并建立Map索引**
```javascript
// 预加载所有方案
const allPlans = await prisma.trainingPlan.findMany({
  include: { courses: { include: { course: true, semesters: true } } }
})

// 建立Map索引
const planByMajor = new Map()
const planByLevel = new Map()
allPlans.forEach(plan => {
  if (plan.majorId) planByMajor.set(plan.majorId, plan)
  if (plan.trainingLevelId) planByLevel.set(plan.trainingLevelId, plan)
})

// 快速查找
classes.forEach(cls => {
  cls.plan = cls.customPlan ||
             planByMajor.get(cls.majorId) ||
             planByLevel.get(cls.trainingLevelId)
})
```

#### 问题7：缺少数据库索引

**现状**：Prisma Schema中未显式定义索引

**影响**：大数据量时查询慢

**建议**：
```prisma
// server/prisma/schema.prisma

model Class {
  id                Int     @id @default(autoincrement())
  name              String
  enrollmentYear    Int
  durationYears     Int
  majorId           Int?
  collegeId         Int?
  trainingLevelId   Int
  studentCount      Int
  customPlanId      Int?
  status            String

  major             Major?          @relation(fields: [majorId], references: [id])
  college           College?        @relation(fields: [collegeId], references: [id])
  trainingLevel     TrainingLevel   @relation(fields: [trainingLevelId], references: [id])
  customPlan        TrainingPlan?   @relation("CustomPlan", fields: [customPlanId], references: [id])

  @@index([enrollmentYear])
  @@index([status])
  @@index([majorId])
  @@index([trainingLevelId])
  @@index([customPlanId])
  @@index([collegeId])
}

model TrainingPlan {
  id                Int     @id @default(autoincrement())
  name              String
  majorId           Int?
  trainingLevelId   Int?
  version           String?
  description       String?

  major             Major?          @relation(fields: [majorId], references: [id])
  trainingLevel     TrainingLevel?  @relation(fields: [trainingLevelId], references: [id])
  courses           PlanCourse[]
  customClasses     Class[]         @relation("CustomPlan")

  @@index([majorId])
  @@index([trainingLevelId])
}

model PlanCourse {
  id                Int     @id @default(autoincrement())
  planId            Int
  courseId          Int
  startSemester     Int
  endSemester       Int
  weeklyHours       Int
  weeksPerSemester  Int
  sortOrder         Int

  plan              TrainingPlan    @relation(fields: [planId], references: [id], onDelete: Cascade)
  course            Course          @relation(fields: [courseId], references: [id])
  semesters         PlanCourseSemester[]

  @@index([planId])
  @@index([courseId])
}

model PlanTextbook {
  id            Int     @id @default(autoincrement())
  semesterId    Int
  textbookId    Int
  isRequired    Boolean @default(true)

  semester      PlanCourseSemester  @relation(fields: [semesterId], references: [id], onDelete: Cascade)
  textbook      Textbook            @relation(fields: [textbookId], references: [id])

  @@index([textbookId])
  @@unique([semesterId, textbookId])
}

model AuditLog {
  id          Int      @id @default(autoincrement())
  action      String
  module      String
  operator    String?
  ip          String?
  details     Json?
  result      String
  message     String?
  createdAt   DateTime @default(now())

  @@index([action])
  @@index([module])
  @@index([createdAt(sort: Desc)])
}
```

**添加索引后的迁移命令**：
```bash
npm run db:migrate
```

#### 问题8：前端大量数据渲染

**现状**：班级列表一次性加载所有数据（虽然后端支持分页）

**影响**：300个班级+展开详情时DOM节点过多

**建议**：

**方案1：启用虚拟滚动**
```bash
npm install vue-virtual-scroller
```

```vue
<!-- 使用虚拟滚动 -->
<RecycleScroller
  :items="classList"
  :item-size="50"
  key-field="id"
  v-slot="{ item }"
>
  <ClassItem :class="item" />
</RecycleScroller>
```

**方案2：懒加载展开内容**
```vue
<template>
  <el-table :data="classList">
    <el-table-column type="expand">
      <template #default="{ row }">
        <!-- 只在展开时加载课程详情 -->
        <CourseList v-if="row.expanded" :class-id="row.id" />
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
function toggleExpand(row) {
  row.expanded = !row.expanded
  if (row.expanded && !row.coursesLoaded) {
    loadCourses(row.id)
    row.coursesLoaded = true
  }
}
</script>
```

**方案3：限制单次展开数量**
```javascript
const expandedRows = ref([])

function toggleExpand(rowId) {
  if (expandedRows.value.includes(rowId)) {
    expandedRows.value = expandedRows.value.filter(id => id !== rowId)
  } else {
    // 最多同时展开5个
    if (expandedRows.value.length >= 5) {
      expandedRows.value.shift() // 移除最早展开的
    }
    expandedRows.value.push(rowId)
  }
}
```

---

### 8.4 用户体验优化

#### 问题9：错误提示不够友好

**现状**：部分错误仅显示"操作失败"

**建议**：

**后端返回更详细的错误信息**：
```javascript
// 优化前
fail(res, '操作失败')

// 优化后
fail(res, '班级名称已存在，请使用其他名称')
fail(res, '入学年份必须为4位数字年份')
fail(res, '学制必须为1-10之间的整数')
```

**前端针对不同错误码显示不同提示**：
```javascript
// 响应拦截器优化
service.interceptors.response.use(
  response => response.data,
  error => {
    let message = '请求失败'

    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 400:
          message = data.message || '请求参数错误'
          // 显示具体字段错误
          if (data.errors) {
            message = Object.values(data.errors).join('\n')
          }
          break
        case 401:
          message = '未授权，请重新登录'
          router.push('/login')
          break
        case 403:
          message = '权限不足，无法执行此操作'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 409:
          message = data.message || '数据冲突'
          break
        case 422:
          message = data.message || '数据验证失败'
          // 显示字段级别的错误
          if (data.errors) {
            message = Object.entries(data.errors)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join('\n')
          }
          break
        case 500:
          message = '服务器内部错误，请联系管理员'
          break
        default:
          message = data.message || '未知错误'
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时，请稍后重试'
    } else if (error.code === 'ERR_NETWORK') {
      message = '网络连接失败，请检查网络'
    }

    ElMessage.error({
      message,
      duration: 5000,
      showClose: true
    })

    return Promise.reject(error)
  }
)
```

#### 问题10：缺少操作反馈

**现状**：导入/导出等操作无进度提示

**建议**：

**大文件导入显示进度条**：
```vue
<template>
  <el-progress
    v-if="uploading"
    :percentage="uploadProgress"
    :status="uploadStatus"
  />
</template>

<script setup>
import axios from 'axios'

const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')

async function handleUpload(file) {
  uploading.value = true
  uploadProgress.value = 0
  uploadStatus.value = ''

  try {
    const res = await axios.post('/api/import/classes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
      }
    })

    uploadStatus.value = 'success'
    ElMessage.success(`导入成功：${res.data.imported}个`)
  } catch (error) {
    uploadStatus.value = 'exception'
    ElMessage.error('导入失败')
  } finally {
    uploading.value = false
  }
}
</script>
```

**导出时显示Loading状态**：
```vue
<template>
  <el-button
    type="primary"
    :loading="exporting"
    @click="handleExport"
  >
    {{ exporting ? '导出中...' : '导出Excel' }}
  </el-button>
</template>

<script setup>
const exporting = ref(false)

async function handleExport() {
  exporting.value = true

  try {
    const response = await fetch('/api/export/semester')
    const blob = await response.blob()

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `开课情况_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>
```

#### 问题11：培养方案矩阵交互复杂

**现状**：新用户可能不理解如何配置课程

**建议**：

**1. 添加新手引导/教程**
```vue
<template>
  <el-tooltip placement="top" effect="light">
    <template #content>
      <div style="max-width: 300px">
        <p><strong>如何配置培养方案：</strong></p>
        <ol>
          <li>点击"添加课程"选择要开设的课程</li>
          <li>设置课程的开课学期范围（如第1~4学期）</li>
          <li>在矩阵表格中点击单元格设置每周课时</li>
          <li>可为课程关联教材（可选）</li>
        </ol>
      </div>
    </template>
    <el-button circle icon="QuestionFilled" />
  </el-tooltip>
</template>
```

**2. 提供"快速配置"模板**
```vue
<template>
  <el-dropdown @command="handleQuickConfig">
    <el-button>快速配置</el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="uniform">统一课时（所有学期4课时）</el-dropdown-item>
        <el-dropdown-item command="front-loaded">前期集中（前4学期8课时）</el-dropdown-item>
        <el-dropdown-item command="back-loaded">后期集中（后4学期8课时）</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
function handleQuickConfig(command) {
  switch (command) {
    case 'uniform':
      // 所有学期设置为4课时
      break
    case 'front-loaded':
      // 前4学期设置为8课时，后面0课时
      break
    case 'back-loaded':
      // 后4学期设置为8课时，前面0课时
      break
  }
}
</script>
```

**3. 增加可视化提示**
```vue
<template>
  <!-- 开课范围用色块标注 -->
  <div
    v-for="semester in maxSemester"
    :key="semester"
    class="semester-cell"
    :class="{
      'in-range': semester >= course.startSemester && semester <= course.endSemester,
      'out-of-range': semester < course.startSemester || semester > course.endSemester
    }"
  >
    <!-- 单元格内容 -->
  </div>
</template>

<style scoped>
.semester-cell.in-range {
  background-color: #e3f2fd;
  border: 2px solid #2196f3;
}

.semester-cell.out-of-range {
  background-color: #f5f5f5;
  opacity: 0.5;
}
</style>
```

---

### 8.5 代码质量与可维护性

#### 问题12：重复代码较多

**现状**：
- 各路由文件中CRUD逻辑重复
- 年级推算逻辑在多处重复（前端、后端）

**建议**：

**1. 抽取通用CRUD服务层**
```javascript
// server/src/services/crud.service.js
export class CRUDService {
  constructor(model) {
    this.model = model
  }

  async findAll(params = {}) {
    const { page = 1, pageSize = 20, ...filters } = params
    const skip = (page - 1) * pageSize
    const take = pageSize

    const [list, total] = await Promise.all([
      this.model.findMany({
        where: filters,
        skip,
        take,
        orderBy: { id: 'asc' }
      }),
      this.model.count({ where: filters })
    ])

    return {
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async findById(id) {
    return this.model.findUnique({
      where: { id }
    })
  }

  async create(data) {
    return this.model.create({ data })
  }

  async update(id, data) {
    return this.model.update({
      where: { id },
      data
    })
  }

  async delete(id) {
    return this.model.delete({
      where: { id }
    })
  }
}
```

**使用示例**：
```javascript
// server/src/routes/major.routes.js
import { CRUDService } from '../services/crud.service.js'
import { prisma } from '../lib/prisma.js'

const majorService = new CRUDService(prisma.major)

router.get('/', async (req, res) => {
  const result = await majorService.findAll(req.query)
  success(res, result)
})

router.post('/', async (req, res) => {
  const data = await majorService.create(req.body)
  success(res, data, '创建成功')
})

router.put('/:id', async (req, res) => {
  const data = await majorService.update(parseInt(req.params.id), req.body)
  success(res, data, '更新成功')
})

router.delete('/:id', async (req, res) => {
  await majorService.delete(parseInt(req.params.id))
  success(res, null, '删除成功')
})
```

**2. 将年级推算封装为独立服务函数**
```javascript
// server/src/services/semester-calculator.service.js
export class SemesterCalculator {
  static calculateGrade(enrollmentYear, currentSemester) {
    const [startYear] = currentSemester.split('-').map(Number)
    return startYear - enrollmentYear + 1
  }

  static calculateCurrentSemesterNum(grade, semesterIndex) {
    return (grade - 1) * 2 + semesterIndex
  }

  static calculateStatus(grade, durationYears) {
    return grade <= durationYears ? 'active' : 'graduated'
  }

  static calculate(enrollmentYear, durationYears, currentSemester) {
    const [,, semesterIndex] = currentSemester.split('-').map(Number)
    const grade = this.calculateGrade(enrollmentYear, currentSemester)
    const currentSemesterNum = this.calculateCurrentSemesterNum(grade, semesterIndex)
    const status = this.calculateStatus(grade, durationYears)

    return {
      grade,
      currentSemesterNum,
      status,
      totalSemesters: durationYears * 2
    }
  }
}
```

**使用示例**：
```javascript
// 在后端使用
import { SemesterCalculator } from '../services/semester-calculator.service.js'

const calc = SemesterCalculator.calculate(2024, 3, '2025-2026-2')
console.log(calc)
// { grade: 2, currentSemesterNum: 4, status: 'active', totalSemesters: 6 }

// 在前端使用（通过API获取，避免重复计算）
const calcResult = await axios.get(`/api/classes/${id}/semester-info`)
```

#### 问题13：缺少单元测试

**现状**：无任何测试代码

**风险**：重构时容易引入bug

**建议**：

**1. 为核心业务逻辑编写单元测试**

安装测试框架：
```bash
npm install --save-dev vitest @vue/test-utils jsdom
npm install --save-dev jest supertest
```

**年级推算测试**：
```javascript
// server/src/services/__tests__/semester-calculator.test.js
import { describe, it, expect } from 'vitest'
import { SemesterCalculator } from '../semester-calculator.service.js'

describe('SemesterCalculator', () => {
  it('应该正确计算年级', () => {
    expect(SemesterCalculator.calculateGrade(2024, '2025-2026-2')).toBe(2)
    expect(SemesterCalculator.calculateGrade(2023, '2025-2026-2')).toBe(3)
  })

  it('应该正确计算当前学期序号', () => {
    expect(SemesterCalculator.calculateCurrentSemesterNum(2, 2)).toBe(4)
    expect(SemesterCalculator.calculateCurrentSemesterNum(3, 1)).toBe(5)
  })

  it('应该正确判断状态', () => {
    expect(SemesterCalculator.calculateStatus(2, 3)).toBe('active')
    expect(SemesterCalculator.calculateStatus(4, 3)).toBe('graduated')
  })

  it('应该完整计算', () => {
    const result = SemesterCalculator.calculate(2024, 3, '2025-2026-2')
    expect(result).toEqual({
      grade: 2,
      currentSemesterNum: 4,
      status: 'active',
      totalSemesters: 6
    })
  })

  it('应该正确处理毕业状态', () => {
    const result = SemesterCalculator.calculate(2024, 3, '2027-2028-1')
    expect(result.status).toBe('graduated')
    expect(result.grade).toBe(4)
  })
})
```

**方案匹配测试**：
```javascript
// server/src/services/__tests__/plan-matcher.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { PlanMatcher } from '../plan-matcher.service.js'
import { prisma } from '../../lib/prisma.js'

describe('PlanMatcher', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.class.deleteMany()
    await prisma.trainingPlan.deleteMany()
  })

  it('应该优先使用自定义方案', async () => {
    const customPlan = await prisma.trainingPlan.create({
      data: { name: '自定义方案' }
    })

    const cls = await prisma.class.create({
      data: {
        name: '测试班级',
        enrollmentYear: 2024,
        durationYears: 3,
        trainingLevelId: 1,
        customPlanId: customPlan.id
      }
    })

    const plan = await PlanMatcher.findForClass(cls.id)
    expect(plan.id).toBe(customPlan.id)
  })

  it('应该按专业匹配方案', async () => {
    const major = await prisma.major.create({ data: { name: '计算机' } })

    const plan = await prisma.trainingPlan.create({
      data: { name: '计算机方案', majorId: major.id }
    })

    const cls = await prisma.class.create({
      data: {
        name: '计算机1班',
        enrollmentYear: 2024,
        durationYears: 3,
        majorId: major.id,
        trainingLevelId: 1
      }
    })

    const matched = await PlanMatcher.findForClass(cls.id)
    expect(matched.id).toBe(plan.id)
  })
})
```

**2. 为API接口编写集成测试**
```javascript
// server/src/__tests__/api/classes.test.js
import request from 'supertest'
import { app } from '../../app.js'
import { prisma } from '../../lib/prisma.js'

describe('Classes API', () => {
  afterEach(async () => {
    await prisma.class.deleteMany()
  })

  it('GET /api/classes 应该返回班级列表', async () => {
    await prisma.class.create({
      data: {
        name: '测试班级',
        enrollmentYear: 2024,
        durationYears: 3,
        trainingLevelId: 1
      }
    })

    const response = await request(app)
      .get('/api/classes')
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.list).toHaveLength(1)
  })

  it('POST /api/classes 应该创建班级', async () => {
    const response = await request(app)
      .post('/api/classes')
      .send({
        name: '新班级',
        enrollmentYear: 2024,
        durationYears: 3,
        trainingLevelId: 1
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.name).toBe('新班级')
  })

  it('POST /api/classes 应该拒绝无效数据', async () => {
    const response = await request(app)
      .post('/api/classes')
      .send({
        name: '', // 空名称
        enrollmentYear: 2024
      })
      .expect(400)

    expect(response.body.success).toBe(false)
  })
})
```

**3. 运行测试**
```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- semester-calculator.test.js

# 运行测试并生成覆盖率报告
npm test -- --coverage
```

#### 问题14：TypeScript未启用

**现状**：前后端均使用JavaScript

**影响**：缺少类型安全，容易出错

**建议**：

**逐步迁移到TypeScript**：

**Step 1: 初始化TypeScript配置**
```bash
# 后端
cd server
npm install --save-dev typescript @types/node @types/express
npx tsc --init

# 前端
cd client
npm install --save-dev typescript @vue/tsconfig
```

**Step 2: 转换Prisma生成的类型**
```typescript
// Prisma已生成类型定义，可直接利用
import { PrismaClient, Class, TrainingPlan } from '@prisma/client'

const prisma = new PrismaClient()

// 类型安全的查询
const classes: Class[] = await prisma.class.findMany()
const plan: TrainingPlan | null = await prisma.trainingPlan.findUnique({
  where: { id: 1 }
})
```

**Step 3: 优先转换后端服务层和前端API层**
```typescript
// server/src/services/semester-calculator.service.ts
interface SemesterCalculationResult {
  grade: number
  currentSemesterNum: number
  status: 'active' | 'graduated'
  totalSemesters: number
}

export class SemesterCalculator {
  static calculate(
    enrollmentYear: number,
    durationYears: number,
    currentSemester: string
  ): SemesterCalculationResult {
    const [startYear, , semesterIndex] = currentSemester.split('-').map(Number)
    const grade = startYear - enrollmentYear + 1
    const currentSemesterNum = (grade - 1) * 2 + semesterIndex
    const status = grade <= durationYears ? 'active' : 'graduated'

    return {
      grade,
      currentSemesterNum,
      status,
      totalSemesters: durationYears * 2
    }
  }
}
```

```typescript
// client/src/api/class.ts
import request from '@/utils/request'

export interface Class {
  id: number
  name: string
  enrollmentYear: number
  durationYears: number
  studentCount: number
  status: 'active' | 'graduated'
  majorId?: number
  collegeId?: number
  trainingLevelId: number
  customPlanId?: number
}

export interface ClassListParams {
  page?: number
  pageSize?: number
  majorId?: number
  status?: string
}

export interface ClassListResponse {
  list: Class[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function getClassList(params: ClassListParams): Promise<ClassListResponse> {
  return request({
    url: '/classes',
    method: 'get',
    params
  })
}
```

---

### 8.6 功能增强建议

#### 建议1：添加数据备份/恢复功能

**需求**：定期自动备份SQLite数据库

**实现方案**：

**1. 提供手动备份按钮（下载.db文件）**
```javascript
// server/src/routes/backup.routes.js
import fs from 'fs'
import path from 'path'

router.get('/download', async (req, res) => {
  const dbPath = path.resolve(__dirname, '../../prisma/dev.db')

  if (!fs.existsSync(dbPath)) {
    return fail(res, '数据库文件不存在', 404)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `backup_${timestamp}.db`

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

  const stream = fs.createReadStream(dbPath)
  stream.pipe(res)
})
```

**2. 定时任务每日自动备份**
```javascript
// server/src/services/backup.service.js
import cron from 'node-cron'
import fs from 'fs'
import path from 'path'

const backupDir = path.resolve(__dirname, '../../backups')

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

// 每天凌晨3点执行备份
cron.schedule('0 3 * * *', async () => {
  console.log('开始自动备份数据库...')
  await performBackup()
  console.log('数据库备份完成')

  // 清理7天前的备份
  cleanupOldBackups(7)
})

async function performBackup() {
  const dbPath = path.resolve(__dirname, '../../prisma/dev.db')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `backup_${timestamp}.db`)

  fs.copyFileSync(dbPath, backupPath)
  console.log(`备份文件已保存: ${backupPath}`)
}

function cleanupOldBackups(days) {
  const files = fs.readdirSync(backupDir)
  const now = Date.now()
  const cutoff = now - (days * 24 * 60 * 60 * 1000)

  files.forEach(file => {
    const filePath = path.join(backupDir, file)
    const stats = fs.statSync(filePath)

    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filePath)
      console.log(`已删除旧备份: ${file}`)
    }
  })
}
```

**3. 支持从备份文件恢复**
```javascript
// server/src/routes/backup.routes.js
import multer from 'multer'

const upload = multer({ dest: 'uploads/' })

router.post('/restore', upload.single('backupFile'), async (req, res) => {
  const backupPath = req.file.path
  const dbPath = path.resolve(__dirname, '../../prisma/dev.db')

  try {
    // 备份当前数据库
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const currentBackup = path.join(backupDir, `before_restore_${timestamp}.db`)
    fs.copyFileSync(dbPath, currentBackup)

    // 恢复备份
    fs.copyFileSync(backupPath, dbPath)

    // 删除临时文件
    fs.unlinkSync(backupPath)

    success(res, '恢复成功')
  } catch (error) {
    fail(res, `恢复失败: ${error.message}`)
  }
})
```

**前端界面**：
```vue
<template>
  <el-card>
    <template #header>数据备份与恢复</template>

    <el-space direction="vertical" style="width: 100%">
      <div>
        <h4>手动备份</h4>
        <el-button type="primary" @click="handleDownloadBackup">
          下载数据库备份
        </el-button>
      </div>

      <div>
        <h4>恢复备份</h4>
        <el-upload
          :before-upload="handleRestoreBackup"
          accept=".db"
          :show-file-list="false"
        >
          <el-button type="warning">选择备份文件恢复</el-button>
        </el-upload>
        <p class="tip">⚠️ 恢复操作将覆盖当前所有数据，请谨慎操作</p>
      </div>

      <div>
        <h4>自动备份</h4>
        <p>系统每天凌晨3点自动备份数据库，保留最近7天的备份</p>
      </div>
    </el-space>
  </el-card>
</template>

<script setup>
import axios from 'axios'

async function handleDownloadBackup() {
  const response = await fetch('/api/backup/download')
  const blob = await response.blob()

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_${new Date().toISOString().slice(0, 10)}.db`
  a.click()
  window.URL.revokeObjectURL(url)
}

async function handleRestoreBackup(file) {
  await ElMessageBox.confirm(
    '恢复备份将覆盖当前所有数据，此操作不可逆！确定要继续吗？',
    '警告',
    {
      confirmButtonText: '确定恢复',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )

  const formData = new FormData()
  formData.append('backupFile', file)

  try {
    await axios.post('/api/backup/restore', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    ElMessage.success('恢复成功，页面将刷新')
    setTimeout(() => location.reload(), 1500)
  } catch (error) {
    ElMessage.error('恢复失败')
  }

  return false // 阻止自动上传
}
</script>
```

#### 建议2：添加数据统计看板

**需求**：首页展示更多维度的统计

**统计内容**：
- 各专业班级分布饼图
- 每学期开课趋势折线图
- 教材使用率排行
- 近期操作日志摘要

**实现方案**：

**后端API**：
```javascript
// server/src/routes/stats.routes.js
router.get('/overview', async (req, res) => {
  const [
    totalClasses,
    totalStudents,
    totalCourses,
    totalTextbooks,
    totalPlans,
    classesByMajor,
    classesByStatus,
    recentLogs
  ] = await Promise.all([
    prisma.class.count(),
    prisma.class.aggregate({ _sum: { studentCount: true } }),
    prisma.course.count(),
    prisma.textbook.count({ where: { isActive: true } }),
    prisma.trainingPlan.count(),
    prisma.class.groupBy({
      by: ['majorId'],
      _count: true,
      include: { major: true }
    }),
    prisma.class.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
  ])

  success(res, {
    totals: {
      classes: totalClasses,
      students: totalStudents._sum.studentCount || 0,
      courses: totalCourses,
      textbooks: totalTextbooks,
      plans: totalPlans
    },
    classesByMajor: classesByMajor.map(item => ({
      majorName: item.major?.name || '未分配',
      count: item._count
    })),
    classesByStatus: classesByStatus.map(item => ({
      status: item.status,
      count: item._count
    })),
    recentLogs
  })
})

router.get('/trends', async (req, res) => {
  const { years = 5 } = req.query
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - parseInt(years)

  // 按入学年份统计班级数和学生数
  const stats = await prisma.class.groupBy({
    by: ['enrollmentYear'],
    _count: true,
    _sum: { studentCount: true },
    where: {
      enrollmentYear: {
        gte: startYear
      }
    }
  })

  success(res, stats)
})
```

**前端图表**（使用ECharts）：
```vue
<template>
  <el-row :gutter="20">
    <!-- 统计卡片 -->
    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totals.classes }}</div>
          <div class="stat-label">班级总数</div>
        </div>
      </el-card>
    </el-col>

    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totals.students }}</div>
          <div class="stat-label">学生总数</div>
        </div>
      </el-card>
    </el-col>

    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totals.courses }}</div>
          <div class="stat-label">课程总数</div>
        </div>
      </el-card>
    </el-col>

    <el-col :span="6">
      <el-card shadow="hover">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totals.plans }}</div>
          <div class="stat-label">培养方案</div>
        </div>
      </el-card>
    </el-col>
  </el-row>

  <el-row :gutter="20" style="margin-top: 20px">
    <!-- 专业分布饼图 -->
    <el-col :span="12">
      <el-card>
        <template #header>专业班级分布</template>
        <div ref="pieChartRef" style="height: 300px"></div>
      </el-card>
    </el-col>

    <!-- 开课趋势折线图 -->
    <el-col :span="12">
      <el-card>
        <template #header>近5年招生趋势</template>
        <div ref="lineChartRef" style="height: 300px"></div>
      </el-card>
    </el-col>
  </el-row>

  <!-- 近期操作日志 -->
  <el-card style="margin-top: 20px">
    <template #header>近期操作日志</template>
    <el-timeline>
      <el-timeline-item
        v-for="log in stats.recentLogs"
        :key="log.id"
        :timestamp="formatTime(log.createdAt)"
        placement="top"
      >
        <el-card>
          <p>{{ log.message }}</p>
          <p class="log-detail">
            {{ log.action }} / {{ log.module }} / {{ log.result }}
          </p>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import axios from 'axios'

const stats = ref({})
const pieChartRef = ref(null)
const lineChartRef = ref(null)

onMounted(async () => {
  await loadStats()
  initCharts()
})

async function loadStats() {
  const [overviewRes, trendsRes] = await Promise.all([
    axios.get('/api/stats/overview'),
    axios.get('/api/stats/trends')
  ])

  stats.value = {
    ...overviewRes.data.data,
    trends: trendsRes.data.data
  }
}

function initCharts() {
  // 饼图
  const pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '50%',
      data: stats.value.classesByMajor.map(item => ({
        name: item.majorName,
        value: item.count
      }))
    }]
  })

  // 折线图
  const lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: stats.value.trends.map(s => s.enrollmentYear)
    },
    yAxis: { type: 'value' },
    series: [{
      name: '班级数',
      type: 'line',
      data: stats.value.trends.map(s => s._count),
      smooth: true
    }, {
      name: '学生数',
      type: 'line',
      data: stats.value.trends.map(s => s._sum.studentCount),
      smooth: true
    }]
  })
}

function formatTime(date) {
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped>
.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;