import { requireRole } from "@/lib/guard";
import { getCenterContact } from "@/lib/queries";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { ContactButtons } from "@/components/contact-buttons";
import ContactForm from "./contact-form";

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const contact = getCenterContact();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cài đặt trung tâm"
        subtitle="Thông tin liên hệ hiện ở trang chủ và trang học viên."
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
