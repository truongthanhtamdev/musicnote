/**
 * Minimal CSV parser: handles quoted fields (with escaped "" inside quotes),
 * commas inside quotes, and \r\n / \n line endings. Good enough for the
 * small admin-authored import files this app accepts.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((f) => f.trim()))
    .filter((r) => r.some((f) => f.length > 0));
}

const DAY_TOKENS: Record<string, number> = {
  cn: 0,
  "chủ nhật": 0,
  t2: 1,
  "thứ 2": 1,
  "thứ hai": 1,
  t3: 2,
  "thứ 3": 2,
  "thứ ba": 2,
  t4: 3,
  "thứ 4": 3,
  "thứ tư": 3,
  t5: 4,
  "thứ 5": 4,
  "thứ năm": 4,
  t6: 5,
  "thứ 6": 5,
  "thứ sáu": 5,
  t7: 6,
  "thứ 7": 6,
  "thứ bảy": 6,
};

/** Parses "T2".."T7"/"CN" (or a raw 0-6) into the 0=CN..6=T7 day index. */
export function parseDayOfWeek(raw: string): number | null {
  const key = raw.trim().toLowerCase();
  if (key in DAY_TOKENS) return DAY_TOKENS[key];
  const n = Number(key);
  if (Number.isInteger(n) && n >= 0 && n <= 6) return n;
  return null;
}
