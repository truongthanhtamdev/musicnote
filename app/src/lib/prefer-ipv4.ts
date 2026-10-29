import dns from "node:dns";

/**
 * Ưu tiên IPv4 khi gọi ra ngoài (Telegram, email...): nhiều VPS có địa chỉ
 * IPv6 nhưng đường IPv6 không thông — curl tự lùi về IPv4 nên vẫn chạy, còn
 * fetch của Node thì báo "fetch failed".
 *
 * Để trong tệp riêng, nạp động từ instrumentation chỉ khi chạy Node: nhập
 * thẳng "node:dns" trong instrumentation.ts làm bản dựng Edge báo lỗi.
 */
export function preferIPv4() {
  dns.setDefaultResultOrder("ipv4first");
}
