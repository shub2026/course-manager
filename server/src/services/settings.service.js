import { prisma } from '../lib/prisma.js';

export async function getCurrentSemesterInfo() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'current_semester' } });
  if (!setting) return null;
  const parts = setting.value.split('-');
  return {
    startYear: Number(parts[0]),
    endYear: Number(parts[1]),
    semesterIndex: Number(parts[2]),
    raw: setting.value,
  };
}
