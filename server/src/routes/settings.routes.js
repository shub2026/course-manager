import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { success, fail } from '../utils/response.js';
import { getCurrentSemesterInfo } from '../services/settings.service.js';

const router = Router();

const DEFAULT_SETTINGS = {
  current_semester: { value: '2025-2026-2', description: '当前学期（格式：起始学年-结束学年-学期序号，如 2025-2026-2 表示2025-2026学年第2学期）' },
  semester_start_date: { value: '2026-02-24', description: '当前学期开学日期' },
  weeks_per_semester_default: { value: '18', description: '每学期默认周数' },
};

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = {};
    settings.forEach((s) => {
      map[s.key] = { value: s.value, description: s.description };
    });
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!map[key]) {
        const created = await prisma.systemSetting.create({
          data: { key, value: def.value, description: def.description },
        });
        map[key] = { value: created.value, description: created.description };
      }
    }
    success(res, map);
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: DEFAULT_SETTINGS[key]?.description || '' },
      });
    }
    success(res, null, '设置已更新');
  } catch (e) { next(e); }
});

export default router;
