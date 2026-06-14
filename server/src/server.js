import 'dotenv/config';
import app from './app.js';
import { prisma } from './lib/prisma.js';
import { log } from './utils/logger.js'; // L1修复：使用winston logger

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  log.info(`Server running on http://localhost:${PORT}`);
});

async function shutdown() {
  log.info('Shutting down...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
