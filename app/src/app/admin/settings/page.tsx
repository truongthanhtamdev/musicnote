import { requireRole } from "@/lib/guard";
import { getCenterContact, getLateCheckinQuota } from "@/lib/queries";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContactButtons } from "@/components/contact-buttons";
import ContactForm from "./contact-form";
import QuotaForm from "./quota-form";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const contact = getCenterContact();
  const quota = getLateCheckinQuota();

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
