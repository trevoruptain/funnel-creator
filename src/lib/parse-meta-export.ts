import * as XLSX from 'xlsx';

export interface ParsedMetaExport {
  reach: number;
  impressions: number;
  amountSpent: number;
  funnelCompleted: number;
  cpc: number;
  linkClicks: number;
  landingPageViews: number;
  frequency: number;
}

function normalizeHeader(h: string): string {
  return String(h ?? '').trim();
}

export function parseMetaExport(buffer: Buffer): ParsedMetaExport {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('No sheet found in Excel file');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  if (!rows.length) {
    throw new Error('Excel file is empty');
  }

  const headerRow = rows[0].map((h) => normalizeHeader(String(h)));
  const dataRows = rows.slice(1).filter((row) => row.some((v) => v != null && v !== ''));

  if (!dataRows.length) {
    throw new Error('No data rows in Excel file');
  }

  const colIndex = (name: string): number => {
    const idx = headerRow.findIndex((h) =>
      h.toLowerCase().includes(name.toLowerCase())
    );
    if (idx === -1) {
      throw new Error(`Expected column "${name}" not found. Headers: ${headerRow.join(', ')}`);
    }
    return idx;
  };

  const getNum = (row: unknown[], key: string): number => {
    const idx = headerRow.findIndex((h) =>
      h.toLowerCase().includes(key.toLowerCase())
    );
    if (idx === -1) return 0;
    const v = row[idx];
    if (v == null || v === '' || v === '-') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const getStr = (row: unknown[], key: string): string => {
    const idx = headerRow.findIndex((h) =>
      h.toLowerCase().includes(key.toLowerCase())
    );
    if (idx === -1) return '';
    const v = row[idx];
    return v == null ? '' : String(v).trim();
  };

  // Aggregate across rows (single row: use directly; multi-row: sum/avg)
  let totalReach = 0;
  let totalImpressions = 0;
  let totalSpend = 0;
  let totalResults = 0;
  let totalLinkClicks = 0;
  let totalLandingPageViews = 0;
  let cpcSum = 0;
  let cpcCount = 0;
  let frequencySum = 0;
  let frequencyCount = 0;

  for (const row of dataRows) {
    const resultType = getStr(row, 'Result type');
    const isWebsiteReg = resultType.toLowerCase().includes('website registration');

    totalReach += getNum(row, 'Reach');
    totalImpressions += getNum(row, 'Impressions');
    totalSpend += getNum(row, 'Amount spent');
    totalLinkClicks += getNum(row, 'Link clicks');
    totalLandingPageViews += getNum(row, 'Landing page views');

    const cpc = getNum(row, 'CPC (cost per link click)');
    if (cpc > 0) {
      cpcSum += cpc;
      cpcCount += 1;
    }

    const freq = getNum(row, 'Frequency');
    if (freq > 0) {
      frequencySum += freq;
      frequencyCount += 1;
    }

    if (isWebsiteReg) {
      totalResults += getNum(row, 'Results');
    } else if (resultType === '' || !resultType) {
      totalResults += getNum(row, 'Results');
    }
  }

  return {
    reach: totalReach,
    impressions: totalImpressions,
    amountSpent: totalSpend,
    funnelCompleted: totalResults,
    cpc: cpcCount > 0 ? cpcSum / cpcCount : 0,
    linkClicks: totalLinkClicks,
    landingPageViews: totalLandingPageViews,
    frequency: frequencyCount > 0 ? frequencySum / frequencyCount : 0,
  };
}
