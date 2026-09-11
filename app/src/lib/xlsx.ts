import { inflateRawSync } from "zlib";

/**
 * Đọc file .xlsx mà không cần thư viện ngoài.
 *
 * .xlsx là một file ZIP chứa vài file XML, mà Node đã có sẵn zlib để giải nén —
 * nên chỉ cần tự đọc mục lục ZIP là xong, khỏi thêm một phụ thuộc mới vào ứng
 * dụng đang chạy thật chỉ để nhập dữ liệu vài lần.
 *
 * Chỉ đọc phần cần cho việc nhập danh sách: ô nào cũng trả về dạng chữ, theo
 * đúng vị trí cột A, B, C... kể cả ô trống ở giữa.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

/** Giải nén một file trong ZIP; trả về null nếu không có file đó. */
function readZipEntry(buf: Buffer, wanted: string): Buffer | null {
  // End of central directory nằm ở cuối file, sau nó tối đa 64KB comment.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const entryCount = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(pos) !== CENTRAL_SIGNATURE) return null;
    const method = buf.readUInt16LE(pos + 10);
    const compSize = buf.readUInt32LE(pos + 20);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + nameLen);

    if (name === wanted) {
      // Header cục bộ khai lại độ dài tên/extra của riêng nó, không dùng lại
      // được số của mục lục.
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      return method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

function decodeXmlText(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** "BC" -> 54: số thứ tự cột (bắt đầu từ 0) từ chữ cái trong địa chỉ ô. */
function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * Trả về từng dòng của sheet đầu tiên dưới dạng mảng chuỗi theo đúng vị trí
 * cột. Ô trống là chuỗi rỗng, nên chỉ số cột luôn khớp với Excel.
 */
export function readXlsxRows(buf: Buffer): string[][] {
  const sharedXml = readZipEntry(buf, "xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    const text = sharedXml.toString("utf8");
    for (const m of text.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      // Một ô có thể gồm nhiều đoạn <t> (chữ in đậm giữa câu chẳng hạn).
      const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXmlText(t[1]));
      shared.push(parts.join(""));
    }
  }

  const sheetXml =
    readZipEntry(buf, "xl/worksheets/sheet1.xml") ?? readZipEntry(buf, "xl/worksheets/Sheet1.xml");
  if (!sheetXml) throw new Error("Không đọc được nội dung file Excel");
  const text = sheetXml.toString("utf8");

  const rows: string[][] = [];
  for (const rowMatch of text.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cell of rowMatch[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const idx = columnIndex(cell[1]);
      const attrs = cell[2];
      const inner = cell[3] ?? "";
      let value = "";
      if (/t="s"/.test(attrs)) {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) value = shared[Number(v[1])] ?? "";
      } else if (/t="inlineStr"/.test(attrs)) {
        value = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
          .map((t) => decodeXmlText(t[1]))
          .join("");
      } else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) value = decodeXmlText(v[1]);
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Đổi số ngày kiểu Excel (45371) thành "YYYY-MM-DD". Excel đếm từ 1899-12-30
 * để bù cho lỗi năm nhuận 1900 mà nó cố tình giữ lại.
 */
export function excelSerialToISO(value: string): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
