import { PrismaClient } from '@prisma/client';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const prisma = new PrismaClient({
  log: isDevelopment 
    ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [{ emit: 'event', level: 'error' }],
});

// 开发环境下监听查询事件
if (isDevelopment) {
  prisma.$on('query', (e) => {
    console.debug(`[Prisma Query] ${e.query} - ${e.duration}ms`);
  });
  
  prisma.$on('error', (e) => {
    console.error('[Prisma Error]', e.message);
  });
  
  prisma.$on('warn', (e) => {
    console.warn('[Prisma Warning]', e.message);
  });
}
