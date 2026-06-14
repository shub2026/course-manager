import { PrismaClient } from '@prisma/client';

const isDevelopment = process.env.NODE_ENV !== 'production';

// 测试环境下显式指定数据源，确保使用测试数据库
const prismaOptions = {
  log: isDevelopment 
    ? [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [{ emit: 'event', level: 'error' }],
};

if (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL) {
  prismaOptions.datasources = {
    db: { url: process.env.DATABASE_URL }
  };
}

export const prisma = new PrismaClient(prismaOptions);

// 开发环境下监听错误和警告事件
if (isDevelopment) {
  prisma.$on('error', (e) => {
    console.error('[Prisma Error]', e.message);
  });
  
  prisma.$on('warn', (e) => {
    console.warn('[Prisma Warning]', e.message);
  });
}
