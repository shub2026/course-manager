import { PrismaClient } from '@prisma/client';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const prisma = new PrismaClient({
  log: isDevelopment 
    ? [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [{ emit: 'event', level: 'error' }],
});

// 开发环境下监听错误和警告事件
if (isDevelopment) {
  prisma.$on('error', (e) => {
    console.error('[Prisma Error]', e.message);
  });
  
  prisma.$on('warn', (e) => {
    console.warn('[Prisma Warning]', e.message);
  });
}
