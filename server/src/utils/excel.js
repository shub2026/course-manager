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

export async function readWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const headers = [];
  const rows = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      row.eachCell((cell, colNum) => {
        headers[colNum - 1] = String(cell.value || '').trim();
      });
    } else {
      const obj = {};
      row.eachCell((cell, colNum) => {
        const header = headers[colNum - 1];
        if (header) obj[header] = cell.value;
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    }
  });

  return rows;
}

export async function workbookToBuffer(workbook) {
  return workbook.xlsx.writeBuffer();
}

export function createTemplateWorkbook(headers, sampleData = []) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('模板');

  sheet.columns = headers.map((h) => ({
    header: h.label,
    key: h.key,
    width: h.width || 20,
  }));

  sampleData.forEach((row) => sheet.addRow(row));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  return workbook;
}
