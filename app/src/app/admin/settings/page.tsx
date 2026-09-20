import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getCenterContact, getLateCheckinQuota } from "@/lib/queries";
import { getBonusRates } from "@/lib/bonus";
import { getLeadSources } from "@/lib/leads";
import { telegramStatus } from "@/lib/telegram";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContactButtons } from "@/components/contact-buttons";
import ContactForm from "./contact-form";
import QuotaForm from "./quota-form";
import BonusForm from "./bonus-form";
import LeadSourcesForm from "./lead-sources-form";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const contact = getCenterContact();
  const quota = getLateCheckinQuota();
  const bonus = getBonusRates();
  const leadSources = getLeadSources();
  const telegram = await telegramStatus();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cài đặt trung tâm"
        subtitle="Thông tin liên hệ và quy định vận hành của trung tâm."
      />

      <Card padded={false}>
        <CardHeader title="Facebook & Zalo liên hệ" />
        <div className="p-5">
          <p className="text-sm text-ink-500 mb-4">
            Khách bấm nút này để nhắn thẳng cho trung tâm. Bỏ trống ô nào thì nút đó không hiện.
          </p>
          <ContactForm contact={contact} />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Quy định điểm danh bù" />
        <div className="p-5">
          <p className="text-sm text-ink-500 mb-4">
            Giáo viên phải điểm danh và ghi nội dung bài học ngay trong buổi, vì phụ huynh đọc
            phần nội dung đó trong trang học viên. Buổi ghi sau ngày học được tính là điểm danh
            bù — quá số lần dưới đây trong một kỳ lương thì buổi đó không được tính công, và
            bảng lương tự trừ.
          </p>
          <QuotaForm quota={quota} />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Thưởng giáo vụ" />
        <div className="p-5">
          <p className="text-sm text-ink-500 mb-4">
            Hệ thống tự ghi thưởng cho giáo vụ phụ trách lớp: một khoản khi buổi học thử dạy xong,
            cộng thêm một khoản khi khách đóng tiền lần đầu. Hai khoản cộng dồn trên cùng một
            khách. Xem tổng theo tháng ở mục Thưởng giáo vụ.
          </p>
          <BonusForm trial={bonus.trial} conversion={bonus.conversion} />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Nguồn khách" />
        <div className="p-5">
          <p className="text-sm text-ink-500 mb-4">
            Danh sách hiện trong ô &ldquo;Từ đâu tới&rdquo; khi thêm khách tiềm năng. Khai riêng
            từng fanpage thì trang Khách tiềm năng mới so sánh được fanpage nào ra khách tốt nhất.
          </p>
          <LeadSourcesForm sources={leadSources} />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Bot Telegram nhắc lịch" />
        <div className="p-5">
          {telegram.enabled ? (
            <>
              <p className="text-sm text-ink-500 mb-3">
                Bot đang chạy{telegram.botUsername ? ` với tên @${telegram.botUsername}` : ""}. Mỗi
                tối bot gửi lịch ngày mai, và nhắc lại trước mỗi buổi khoảng một tiếng. Ai đã nối
                tài khoản cũng nhận luôn các thông báo của web ngay trên điện thoại.
              </p>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-navy-100 bg-ivory-50 px-3 py-2.5">
                  <dt className="text-xs text-ink-500">Đã nối</dt>
                  <dd className="text-lg font-bold text-ink-900 tabular">{telegram.linkedTotal}</dd>
                </div>
                <div className="rounded-xl border border-navy-100 bg-ivory-50 px-3 py-2.5">
                  <dt className="text-xs text-ink-500">Giáo viên</dt>
                  <dd className="text-lg font-bold text-ink-900 tabular">
                    {telegram.linkedTeachers}
                  </dd>
                </div>
                <div className="rounded-xl border border-navy-100 bg-ivory-50 px-3 py-2.5">
                  <dt className="text-xs text-ink-500">Học viên</dt>
                  <dd className="text-lg font-bold text-ink-900 tabular">
                    {telegram.linkedStudents}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-ink-500 mt-3">
                Mỗi người tự nối máy của mình ở trang{" "}
                <Link href="/account/telegram" className="font-medium text-wood-700 hover:underline">
                  Nhắc lịch Telegram
                </Link>{" "}
                — giáo viên và học viên đều thấy mục này trong menu.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-500 mb-3">
                Chưa bật. Bật xong thì giáo viên và học viên nhận nhắc lịch thẳng vào Telegram, không
                cần ai ngồi nhắn tay.
              </p>
              <ol className="text-sm text-ink-600 space-y-1.5 list-decimal pl-5">
                <li>
                  Mở Telegram, nhắn cho <span className="font-mono text-ink-900">@BotFather</span>,
                  gõ <span className="font-mono text-ink-900">/newbot</span> rồi đặt tên.
                </li>
                <li>BotFather trả về một dãy token — chép lại.</li>
                <li>
                  Trên máy chủ, thêm dòng{" "}
                  <span className="font-mono text-ink-900">TELEGRAM_BOT_TOKEN=...</span> vào tệp{" "}
                  <span className="font-mono text-ink-900">.env.local</span>.
                </li>
                <li>Khởi động lại web. Mục này sẽ tự chuyển sang &ldquo;đang chạy&rdquo;.</li>
              </ol>
            </>
          )}
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Xem thử" />
        <div className="p-5">
          <ContactButtons label="" />
          {!contact.facebook && !contact.zalo && (
            <p className="text-sm text-ink-400">Chưa khai thông tin nào nên chưa có nút nào hiện.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
