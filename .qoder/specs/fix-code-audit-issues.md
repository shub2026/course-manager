# 代码审查问题修复计划

## Context

根据全面代码审查报告（`docs/code-audit-report.md`），发现28个已确认问题，涵盖安全漏洞、功能缺陷、性能优化和代码质量四个方面。本次修复旨在系统性解决这些问题，提升系统安全性和稳定性。

## 修复范围

**用户要求：先修复第一批（4个Critical问题）**

### 第一批：Critical（4个问题）— 立即修复

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| 1 | 7个数据重置接口缺少权限验证 | `settings.routes.js:63,82,101,120,132,142,150` | 任何登录用户可清空数据库 |
| 2 | 教材导出使用错误Prisma关系名 | `export.routes.js:294-303,334-337` | 功能完全不可用 |
| 3 | 学期导出自定义方案班级被跳过 | `export.routes.js:157` | 导出数据缺失 |
| 4 | errorHandler无法识别statusCode | `error.js:6` | 所有AppError返回500 |

### 第二批：High（7个问题）— 待后续修复

| # | 问题 | 文件 |
|---|------|------|
| 5 | 班级更新意外清除custom_plan_id | `class.routes.js:272` |
| 6 | 培养方案审计日志属性名错误 | `plan.routes.js:149,230,244` |
| 7 | 方案课程审计日志属性名错误 | `plan.routes.js:411` |
| 8 | 重置基础数据不清空培养方案 | `settings.routes.js:49-58` |
| 9 | 重置操作缺少事务保护 | `settings.routes.js` 所有reset端点 |
| 10 | 教材关联操作缺少事务保护 | `plan.routes.js:693-704` |
| 11 | XSS风险：dangerouslyUseHTMLString | `ClassList.vue:818-833` |
| 12 | fetchUserInfo/401重试无递归限制 | `auth.js:78-91`, `request.js:52-84` |
| 13 | localStorage解析无try-catch | `auth.js:9` |
| 14 | 排序按钮筛选时操作错误记录 | `PlanList.vue:65`, `TextbookList.vue:75` |

### 第三批：Medium（10个问题）— 待后续修复

| # | 问题 | 文件 |
|---|------|------|
| 15 | logs数组未被命名转换中间件处理 | `naming.middleware.js:34-42` |
| 16 | ClassList筛选框无debounce | `ClassList.vue:8` |
| 17 | SemesterQuery导出未携带筛选参数 | `SemesterQuery.vue:144` |
| 18 | 教材查询totalStudents重复计算 | `query.routes.js:343-358` |
| 19 | getCurrentSemesterInfo未校验格式 | `settings.service.js:6-9` |
| 20 | PlanDetail加载所有方案只为查找一个 | `PlanDetail.vue:86` |
| 21 | ClassList额外请求1000条提取年份 | `ClassList.vue:436` |
| 22 | 导入循环内重复查询getCurrentSemesterInfo | `import.routes.js:216` |
| 23 | JWT Secret硬编码为默认值 | `auth.config.js:2` |
| 24 | 大量console.log残留在导入路由 | `import.routes.js` 30+处 |

### 第四批：Low（7个问题）— 待后续修复

| # | 问题 | 文件 |
|---|------|------|
| 25 | .env未加入.gitignore | `.gitignore` |
| 26 | Token通过URL参数传递 | 多个Vue文件 |
| 27 | convertRequestNaming未注册 | `naming.middleware.js` |
| 28 | validation.js全部规则未使用 | `validation.js` |

## 实施策略

### 第一批：Critical修复（本次执行）

#### 1. settings.routes.js — 为7个reset接口添加super_admin权限

**修改位置：** 行63, 82, 101, 120, 132, 142, 150

**修改内容：** 在每个路由定义中添加 `roleMiddleware('super_admin')` 作为第二个参数

```javascript
// 修改前
router.post('/reset/majors', async (req, res, next) => { ... })

// 修改后
router.post('/reset/majors', roleMiddleware('super_admin'), async (req, res, next) => { ... })
```

**涉及接口：**
- `/reset/majors` - 清空专业
- `/reset/colleges` - 清空学院
- `/reset/levels` - 清空培养层次
- `/reset/courses` - 清空课程
- `/reset/textbooks` - 清空教材
- `/reset/classes` - 清空班级
- `/reset/plans` - 清空培养方案

---

#### 2. export.routes.js — 修正教材导出的Prisma关系名

**修改位置：** 行294-303（查询include）和行334-337（数据访问）

**问题分析：** Prisma schema中关系名使用snake_case，但代码使用了camelCase

**修改内容：**

```javascript
// 修改前（错误）
include: {
  planTextbooks: {  // ❌
    include: { semester: {  // ❌
      include: { planCourses: {  // ❌
        include: { plan: { ... } }  // ❌
```

```javascript
// 修改后（正确）
include: {
  plan_textbooks: {  // ✅
    include: { plan_course_semesters: {  // ✅
      include: { plan_courses: {  // ✅
        include: { training_plans: { ... } }  // ✅
```

同时修正数据访问部分（行334-337）：

```javascript
// 修改前
for (const pt of textbook.plan_textbooks) {
  const sem = pt.semester;
  const pc = sem.plan_courses;
  const plan = pc.plan;

// 修改后
for (const pt of textbook.plan_textbooks) {
  const sem = pt.plan_course_semesters;
  const pc = sem.plan_courses;
  const plan = pc.training_plans;
```

---

#### 3. export.routes.js — 学期导出添加自定义方案支持

**修改位置：** 行94-118（classes查询）和行154-176（findBestMatchPlan函数）

**问题分析：** classes查询的include中没有包含customPlan关系，导致自定义方案的班级被跳过

**修改内容：**

在行94-118的classes查询中添加customPlan关系：

```javascript
const classes = await prisma.classes.findMany({
  where: { status: 'active' },
  include: {
    majors: true,
    colleges: true,
    training_levels: true,
    training_plans: {  // 已有
      include: { ... }
    },
    customPlan: {  // ✅ 新增
      include: {
        plan_courses: {
          include: {
            courses: true,
            plan_course_semesters: {
              include: {
                plan_textbooks: { include: { textbooks: true } },
              },
            },
          },
        },
      },
    },
  },
});
```

修正findBestMatchPlan函数（行157）：

```javascript
// 修改前
if (cls.custom_plan_id) {
  return cls.customPlan;  // undefined

// 修改后
if (cls.custom_plan_id && cls.customPlan) {
  return cls.customPlan;  // 现在能正确获取
}
```

---

#### 4. error.js — 兼容statusCode和status属性

**修改位置：** 行6

**修改内容：**

```javascript
// 修改前
const status = err.status || 500;

// 修改后
const status = err.statusCode || err.status || 500;
```

---

## 关键文件清单（第一批）

| 文件路径 | 修改类型 | 预计改动行数 |
|---------|---------|-------------|
| server/src/routes/settings.routes.js | 添加权限中间件 | +7/-0 |
| server/src/routes/export.routes.js | 修正关系名+添加customPlan | +25/-20 |
| server/src/middleware/error.js | 属性兼容 | +1/-1 |

**总计：** 约33行修改，涉及3个文件

---

## 验证方案（第一批）

### 手动功能验证清单

| 验证项 | 操作步骤 | 预期结果 |
|-------|---------|---------|
| **权限修复** | 用viewer/admin账号调用POST /api/settings/reset/classes | 返回403 Forbidden |
| **权限修复** | 用super_admin账号调用同一接口 | 返回200成功执行 |
| **教材导出** | 在教材管理页点击"导出使用情况" | 成功下载Excel，无500错误 |
| **教材导出** | 检查导出Excel内容 | 包含所有使用该教材的班级数据 |
| **自定义方案导出** | 创建带自定义方案的班级，导出学期开课情况 | Excel中包含该班级的完整开课数据 |
| **错误处理** | 触发一个NotFoundError或ValidationError | 返回正确的404/422状态码而非500 |

### 回归测试重点

- 所有数据重置接口对非super_admin用户返回403
- super_admin仍可正常执行重置操作
- 教材导出和学期导出功能正常工作
- 其他API接口的错误处理不受影响

---

## 风险控制

1. **备份数据库**：修复前执行 `cp server/prisma/dev.db server/prisma/dev.db.backup`
2. **逐个修复验证**：每个问题修复后立即测试，确保不影响其他功能
3. **Git提交**：第一批修复完成后单独commit，便于回滚
4. **权限测试**：准备三个不同角色的测试账号，验证权限控制生效
