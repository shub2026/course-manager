import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import majorRoutes from './routes/major.routes.js';
import courseRoutes from './routes/course.routes.js';
import textbookRoutes from './routes/textbook.routes.js';
import classRoutes from './routes/class.routes.js';
import planRoutes from './routes/plan.routes.js';
import queryRoutes from './routes/query.routes.js';
import importRoutes from './routes/import.routes.js';
import exportRoutes from './routes/export.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import trainingLevelRoutes from './routes/trainingLevel.routes.js';
import collegeRoutes from './routes/college.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { authMiddleware, roleMiddleware } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 公开路由（无需认证）
app.use('/api/auth', authRoutes);

// 健康检查接口 - 增强版
app.get('/api/health', async (req, res) => {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: Math.round(process.uptime())
    });
  } catch (e) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: e.message
    });
  }
});

// 查询接口 - 所有登录用户可访问
app.use('/api/query', authMiddleware, queryRoutes);

// 导出接口 - 所有登录用户可访问
app.use('/api/export', authMiddleware, exportRoutes);

// 用户管理 - admin和super_admin可访问（admin只能管理访客）
app.use('/api/users', authMiddleware, roleMiddleware('admin', 'super_admin'), userRoutes);

// 基础数据管理 - 所有登录用户GET可访问，修改需要admin权限（在路由文件中控制）
app.use('/api/majors', authMiddleware, majorRoutes);
app.use('/api/colleges', authMiddleware, collegeRoutes);
app.use('/api/training-levels', authMiddleware, trainingLevelRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/textbooks', authMiddleware, textbookRoutes);

// 班级管理 - 所有登录用户GET可访问，修改需要admin权限
app.use('/api/classes', authMiddleware, classRoutes);

// 培养方案管理 - 所有登录用户GET可访问，修改需要admin权限
app.use('/api/plans', authMiddleware, planRoutes);

// 导入接口 - admin和super_admin可访问
app.use('/api/import', authMiddleware, roleMiddleware('admin', 'super_admin'), importRoutes);

// 系统设置 - GET所有登录用户可访问，PUT需要super_admin权限
app.use('/api/settings', authMiddleware, settingsRoutes);

// 审计日志 - 仅超级管理员可访问
app.use('/api/audit', authMiddleware, roleMiddleware('super_admin'), auditRoutes);

app.use(errorHandler);

export default app;
