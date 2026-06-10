import { prisma } from '../lib/prisma.js';

export async function getCurrentSemesterInfo() {
  const setting = await prisma.system_settings.findUnique({ where: { key: 'current_semester' } });
  if (!setting) return null;
  const parts = setting.value.split('-');
  const startYear = Number(parts[0]);
  const endYear = Number(parts[1]);
  const semesterIndex = Number(parts[2]);
  
  return {
    startYear,
    endYear,
    semesterIndex,
    raw: setting.value,
    label: formatSemesterLabel(startYear, endYear, semesterIndex),
  };
}

/**
 * 将学期格式转换为友好显示格式
 * @param {number} startYear - 学年起始年
 * @param {number} endYear - 学年结束年
 * @param {number} semesterIndex - 学期索引(1或2)
 * @returns {string} 格式化后的学期标签，如 "2026年春季(第2学期)"
 */
export function formatSemesterLabel(startYear, endYear, semesterIndex) {
  const season = semesterIndex === 1 ? '秋季' : '春季';
  const displayYear = semesterIndex === 1 ? startYear : endYear;
  
  return `${displayYear}年${season}(第${semesterIndex}学期)`;
}
