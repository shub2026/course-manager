import ExcelJS from 'exceljs';

export async function createWorkbook(headers, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('数据');

  sheet.columns = headers.map((h) => ({
    header: h.label,
    key: h.key,
    width: h.width || 20,
  }));

  rows.forEach((row) => sheet.addRow(row));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  return workbook;
}

/**
 * 将Excel单元格值转换为JavaScript原始值
 * @param {*} value - Excel单元格原始值
 * @returns {*} 转换后的值
 */
function normalizeCellValue(value) {
  if (value === null || value === undefined) return null;
  
  // 处理日期对象
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // 处理对象（ExcelJS可能返回的对象）
  if (typeof value === 'object') {
    // 如果是ExcelJS的RichText或其他对象，尝试提取文本
    if (value.richText && Array.isArray(value.richText)) {
      return value.richText.map(rt => rt.text || '').join('');
    }
    if (value.text) return value.text;
    if (value.result !== undefined) return value.result;
    return String(value);
  }
  
  // 处理数字字符串（去除尾随空格）
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // 尝试转换为数字
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    if (/^\d+\.\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  
  return value;
}

export async function readWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const headers = [];
  const rows = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      // 读取表头,去除可能的 * 前缀(模板中的必填标记)
      row.eachCell((cell, colNum) => {
        const headerValue = String(cell.value || '').trim();
        // 去除开头的 * 号
        headers[colNum - 1] = headerValue.startsWith('*') ? headerValue.substring(1).trim() : headerValue;
      });
      console.log('[Excel读取] 表头:', headers);
    } else {
      const obj = {};
      
      // 关键修复: 基于表头数量遍历列,而不是只遍历有值的单元格
      for (let colNum = 1; colNum <= headers.length; colNum++) {
        const header = headers[colNum - 1];
        if (header) {
          const cell = row.getCell(colNum);
          obj[header] = normalizeCellValue(cell.value);
        }
      }
      
      // 只添加非空行（至少有一个有效字段）
      const hasValidData = Object.values(obj).some(v => v !== null && v !== '');
      if (hasValidData) {
        console.log(`[Excel读取] 第${rowNum}行数据:`, obj);
        rows.push(obj);
      }
    }
  });

  console.log(`[Excel读取] 总共读取 ${rows.length} 行数据`);
  return rows;
}

export async function workbookToBuffer(workbook) {
  return workbook.xlsx.writeBuffer();
}

export function createTemplateWorkbook(headers, sampleData = []) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('模板');

  sheet.columns = headers.map((h) => ({
    header: h.required ? `*${h.label}` : h.label,
    key: h.key,
    width: h.width || 20,
  }));

  sampleData.forEach((row) => sheet.addRow(row));

  // 设置表头样式
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  
  // 为每个单元格设置背景色
  headers.forEach((h, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: h.required ? 'FFFFCCCC' : 'FFE0E0E0' }, // 必填字段用浅红色，可选字段用浅灰色
    };
    if (h.required) {
      cell.font = { bold: true, color: { argb: 'FFCC0000' } }; // 必填字段字体为深红色
    }
  });

  return workbook;
}
