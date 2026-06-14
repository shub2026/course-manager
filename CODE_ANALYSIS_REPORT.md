# KEC课程管理平台 - 全面代码审查报告

**审查日期**: 2026-06-14
**检测时间**: 2026-06-14 14:30:00 - 15:45:00 (UTC+8)
**项目版本**: v1.0.7
**审查范围**: 前后端代码、数据库架构、安全性、部署配置

---

## 📊 执行摘要

本次审查对KEC课程管理平台进行了全面的代码质量、架构设计、安全性和性能分析。整体而言，项目具备良好的基础架构和清晰的代码组织，但在多个方面存在需要改进的问题。

**总体评分**: **6.5/10**

### 关键发现
- ✅ 清晰的分层架构和良好的代码组织
- ⚠️ 后端缺少统一的控制器层，部分路由直接嵌入业务逻辑
- ⚠️ 前端存在大量调试日志和重复代码
- ❌ 数据库缺少关键索引，存在性能风险
- ⚠️ XSS防护使用简单的正则替换，不够安全
- ✅ JWT双令牌认证机制实现良好
- ⚠️ 部署脚本存在安全隐患（硬编码默认密码）

---

## 1️⃣ 后端代码分析

### 1.1 架构评估

**目录结构**: ✅ 良好
```
server/src/
├── config/          # 配置管理
├── controllers/     # 控制器层（仅plan和export模块）
├── lib/             # 外部库封装
├── middleware/      # 中间件链
├── routes/          # 路由定义（14个模块）
├── services/        # 业务逻辑层
├── utils/           # 工具函数
└── constants/       # 常量定义
```

**问题**:
- ❌ **架构不一致**: 只有`plan`和`export`模块使用了控制器层，其他12个模块的路由直接包含业务逻辑
- ⚠️ **代码重复**: 学期计算逻辑在3个文件中重复出现
- ⚠️ **服务层模式不统一**: 部分使用静态类（AuthService），部分使用普通函数

### 1.2 代码质量问题

#### 🔴 严重问题

1. **XSS防护不足** (`import.routes.js:14-18`)
   ```javascript
   function sanitizeInput(value) {
     const str = String(value).trim();
     return str.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '');
   }
   ```
   **风险**: 简单的正则替换无法防御所有XSS攻击向量
   **建议**: 使用专业库如`DOMPurify`或`xss`

2. **N+1查询问题** (`query.routes.js:64-184`)
   - 获取班级列表时加载完整的培养计划树
   - 然后在JavaScript中进行匹配过滤
   - **影响**: 大数据量下会导致内存溢出

3. **输入验证不完整**
   - 许多POST/PUT端点缺少输入类型验证
   - 依赖Prisma运行时错误而非主动验证

#### 🟡 中等问题

4. **硬编码值分散**
   - 分页大小默认值在各文件中不一致
   - 文件上传路径`'uploads/'`硬编码
   - 学期格式假设硬编码

5. **控制台日志过多**
   - 发现27处console.log/warn/error调用
   - `UserManagement.vue`有8处DEBUG日志
   - **建议**: 全部替换为winston logger

6. **未使用的常量**
   - `constants/index.js`定义了多个未使用的常量
   - `CLASS_STATUS`, `USER_ROLES`, `PASSWORD_POLICY`等

### 1.3 依赖项审查

**当前依赖**:
```json
{
  "@prisma/client": "^6.19.3",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.5",
  "exceljs": "^4.4.0",
  "express": "^5.1.0",
  "helmet": "^8.2.0",
  "jsonwebtoken": "^9.0.3"
}
```

**问题**:
- ❌ **Express 5.1.0处于测试阶段**，生产环境建议使用稳定版4.x
- ❌ **缺少dotenv依赖**，使用动态import作为后备方案
- ❌ **缺少测试框架**（jest/mocha/vitest）

---

## 2️⃣ 前端代码分析

### 2.1 架构评估

**目录结构**: ✅ 良好
```
client/src/
├── api/           # API集成层（9个模块）
├── components/    # 可复用组件（3个）
├── router/        # 路由配置
├── stores/        # Pinia状态管理（2个store）
├── utils/         # 工具函数
└── views/         # 页面组件（18个视图）
```

### 2.2 代码质量问题

#### 🔴 严重问题

1. **混合API调用方式**
   - 部分视图使用axios实例（`request.js`）
   - 部分视图直接使用原生fetch()：
     - `CourseList.vue` (lines 171, 202)
     - `TextbookList.vue` (lines 428, 459)
     - `ClassList.vue` (lines 672, 703)
   - **影响**: fetch调用绕过token自动刷新和统一错误处理

2. **调试日志未清理**
   - `UserManagement.vue`有8处[DEBUG]日志
   - 总计66处console语句分布在19个文件中

3. **组件过大**
   - `CourseMatrix.vue`: 972行
   - `ClassList.vue`: 1053行
   - `SystemSettings.vue`: 1245行
   - **建议**: 单组件应控制在400-600行以内

#### 🟡 中等问题

4. **代码重复**
   - `MajorList.vue`, `CollegeList.vue`, `CourseList.vue`有几乎相同的排序逻辑
   - 导出/下载模板功能在多个文件中重复

5. **未使用的依赖**
   - `sortablejs`已安装但未在任何地方使用

6. **命名约定不一致**
   - `UserManagement.vue`使用snake_case（`real_name`, `is_active`）
   - 其他组件使用camelCase

### 2.3 状态管理问题

**auth.js Store**:
- ⚠️ Token刷新队列复杂，可能静默失败
- ⚠️ localStorage解析缺少try-catch保护（仅userInfo有保护）

**settings.js Store**:
- ⚠️ 每次加载都重新获取设置，无缓存策略

---

## 3️⃣ 数据库架构分析

### 3.1 数据模型

**表数量**: 12个核心表
- users, audit_logs, colleges, majors, training_levels
- classes, courses, textbooks
- training_plans, plan_courses, plan_course_semesters, plan_textbooks
- system_settings

**评分**: 7/10 - 设计合理但缺少约束

### 3.2 索引问题 🔴 严重

**缺失的关键索引**:

1. **training_plans表** - 无任何索引
   - 频繁查询字段：`major_id`, `college_id`, `training_level_id`
   - **影响**: 全表扫描，数据增长后性能急剧下降

2. **plan_course_semesters表** - 缺少`semester`索引
   - 按学期筛选时性能差

3. **plan_textbooks表** - 缺少外键索引
   - `semester_id`, `textbook_id`未索引

4. **classes表** - 缺少`custom_plan_id`索引

**冗余索引**:
- `users.username`既有UNIQUE约束又有显式INDEX - 冗余

### 3.3 完整性约束

**缺失的CHECK约束**:
- `classes.duration_years` 应为正整数（1-8）
- `classes.student_count` 应 >= 0
- `plan_course_semesters.weeks_count` 应 > 0
- `start_semester` <= `end_semester` 未强制

**枚举字段无约束**:
- `users.role` 无有效值约束
- `classes.status` 无有效状态约束
- `courses.type` 无有效类型约束

### 3.4 级联规则问题

**RESTRICT规则可能导致操作困难**:
- `plan_courses.course_id` RESTRICT - 无法删除被引用的课程
- `plan_textbooks.textbook_id` RESTRICT - 无法删除被引用的教材

**建议**: 考虑软删除或使用SET NULL

---

## 4️⃣ 安全性分析

### 4.1 认证与授权 ✅ 良好

**JWT双令牌机制**:
- Access Token: 15分钟
- Refresh Token: 7天
- Download Token: 60秒

**密码加密**: bcrypt with 12轮迭代 ✅

**速率限制**: 登录接口10次/15分钟 ✅

### 4.2 安全问题

#### 🟡 中等问题

1. **Download Token通过URL参数传递** (`auth.middleware.js:12-22`)
   ```javascript
   else if (req.query.downloadToken) {
     const decoded = AuthService.verifyDownloadToken(req.query.downloadToken)
   }
   ```
   **风险**: URL参数会被记录在服务器日志和浏览器历史中

2. **派生密钥强度不足** (`auth.config.js:31-32`)
   ```javascript
   const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + '_refresh'
   const jwtDownloadSecret = process.env.JWT_DOWNLOAD_SECRET || jwtSecret + '_download'
   ```
   **风险**: 如果JWT_SECRET泄露，所有派生密钥也会被推导出来

3. **密码策略未强制执行**
   - `constants/index.js`定义了`PASSWORD_POLICY`但未在用户创建时使用

#### 🔴 严重问题

4. **部署脚本硬编码默认密码** (`deploy.sh:238-239`)
   ```bash
   echo "  密码: admin@123456"
   ```
   **风险**: 如果仓库公开，任何人都知道默认密码

---

## 5️⃣ 部署配置分析

### 5.1 部署脚本评估

**优点**:
- ✅ 自动化程度高，一键部署
- ✅ 包含健康检查验证
- ✅ 自动生成安全的JWT密钥
- ✅ PM2进程管理

**问题**:

1. **SQLite并发限制**
   - 生产环境使用SQLite，不支持高并发写入
   - **建议**: 数据量大时迁移到PostgreSQL

2. **数据库重置风险** (`deploy.sh:143`)
   ```bash
   npx prisma migrate deploy || (echo '迁移失败，尝试重置数据库...' && npx prisma migrate reset --force)
   ```
   **风险**: 自动重置会清空所有生产数据！

3. **CORS配置提示不明确**
   - 默认设置为`https://kec.sntip.cn`，容易忘记修改

### 5.2 环境变量管理

**✅ 良好实践**:
- .env文件权限设置为600
- 仅在不存在时生成，避免覆盖已有配置

**⚠️ 需要注意**:
- 首次部署后需手动修改CORS_ORIGINS
- JWT密钥自动生成但文档未说明如何轮换

---

## 6️⃣ 性能问题

### 6.1 后端性能瓶颈

1. **复杂查询无优化** (`query.routes.js:300-396`)
   - 教科书使用情况查询复杂度：O(textbooks × plans × classes)
   - 无数据库层聚合，全部在JavaScript中计算

2. **无缓存策略**
   - 频繁访问的数据（majors, courses, settings）每次都查询数据库
   - **建议**: 添加Redis或内存缓存

3. **无请求超时配置**
   - 长时间运行的操作（Excel导出）无超时保护

### 6.2 前端性能问题

1. **无虚拟滚动**
   - 大列表渲染会导致页面卡顿

2. **无请求取消机制**
   - 组件卸载时未取消进行中的请求
   - 可能导致内存泄漏

3. **Bundle体积未优化**
   - 无代码分割和懒加载（除路由外）

---

## 7️⃣ 优先级修复建议

### 🔴 高优先级（立即修复）

1. **添加数据库索引**
   ```sql
   -- training_plans表
   CREATE INDEX idx_training_plans_major ON training_plans(major_id);
   CREATE INDEX idx_training_plans_college ON training_plans(college_id);
   CREATE INDEX idx_training_plans_level ON training_plans(training_level_id);

   -- plan_course_semesters表
   CREATE INDEX idx_plan_course_semesters_semester ON plan_course_semesters(semester);

   -- plan_textbooks表
   CREATE INDEX idx_plan_textbooks_semester ON plan_textbooks(semester_id);
   CREATE INDEX idx_plan_textbooks_textbook ON plan_textbooks(textbook_id);

   -- classes表
   CREATE INDEX idx_classes_custom_plan ON classes(custom_plan_id);
   ```

2. **移除生产环境的调试日志**
   - 删除`UserManagement.vue`中的8处DEBUG日志
   - 将所有console.*替换为winston logger

3. **标准化API调用**
   - 将4个使用fetch()的视图改为使用axios实例
   - 确保token自动刷新生效

4. **修复XSS防护**
   ```bash
   npm install xss
   ```
   ```javascript
   import xss from 'xss';
   const sanitized = xss(inputValue);
   ```

5. **移除硬编码默认密码提示**
   - 从`deploy.sh`中删除默认密码显示
   - 改为提示用户查看种子脚本生成的随机密码

### 🟡 中优先级（下一迭代）

6. **统一后端架构**
   - 为所有路由模块创建控制器层
   - 消除路由中的内联业务逻辑

7. **拆分大型组件**
   - `CourseMatrix.vue` → 拆分为矩阵单元格子组件
   - `ClassList.vue` → 拆分为表格、对话框、过滤器子组件
   - `SystemSettings.vue` → 按功能模块拆分

8. **添加输入验证**
   - 对所有POST/PUT端点添加express-validator中间件
   - 特别是日期和数值字段

9. **优化文本框使用查询**
   - 在数据库层面进行聚合计算
   - 减少JavaScript层的嵌套循环

10. **添加请求超时和取消**
    ```javascript
    // 前端
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30000);
    fetch(url, { signal: controller.signal });
    ```

### 🟢 低优先级（未来改进）

11. **升级Express到稳定版本**
    - 从5.1.0回退到4.x稳定版，或等待5.x正式版

12. **添加TypeScript支持**
    - 提高类型安全性
    - 改善开发体验

13. **实施测试套件**
    - 单元测试（Jest/Vitest）
    - E2E测试（Playwright/Cypress）

14. **实现缓存策略**
    - Redis用于会话和数据缓存
    - 前端添加HTTP缓存头

15. **数据库迁移到PostgreSQL**
    - 当预期数据量超过10,000条班级记录时
    - 需要高并发写入支持时

---

## 8️⃣ 代码质量指标

| 指标 | 评分 | 说明 |
|------|------|------|
| 代码组织 | 8/10 | 清晰的分层架构 |
| 可读性 | 7/10 | 良好的命名，但缺少注释 |
| 可维护性 | 6/10 | 架构不一致增加维护成本 |
| 安全性 | 6/10 | 基础安全措施到位，但存在漏洞 |
| 性能 | 5/10 | 缺少索引和缓存，查询效率低 |
| 可扩展性 | 5/10 | SQLite和架构问题限制扩展 |
| 测试覆盖率 | 0/10 | 无自动化测试 |
| 文档完整性 | 6/10 | README详细，但代码注释少 |

**综合评分**: **5.4/10**

---

## 9️⃣ 总结

KEC课程管理平台是一个功能完整的教学管理系统，具备以下优势：
- ✅ 清晰的前后端分离架构
- ✅ 完善的JWT认证和审计日志
- ✅ 丰富的导入导出功能
- ✅ 自动化部署脚本

但同时存在需要重点关注的问题：
- ❌ 数据库索引缺失严重影响性能
- ❌ 安全防护不够完善（XSS、默认密码）
- ❌ 代码重复和调试日志未清理
- ❌ 缺乏自动化测试

**建议行动**:
1. 立即修复高优先级问题（索引、日志、XSS）
2. 规划中期改进（架构统一、组件拆分）
3. 制定长期技术债务清偿计划（TypeScript、测试、数据库迁移）

---

**报告生成时间**: 2026-06-14 15:45:00 (UTC+8)
**下次审查建议**: 完成高优先级修复后进行复审
