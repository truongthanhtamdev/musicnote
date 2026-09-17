/**
 * Nhúng một khối JSON-LD vào trang.
 *
 * Dùng dangerouslySetInnerHTML vì nội dung là JSON do chính mình dựng từ dữ
 * liệu trong mã nguồn, không phải chữ người dùng nhập. Chặn "<" để phòng
 * trường hợp sau này có ai nối chuỗi từ CSDL vào đây.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
