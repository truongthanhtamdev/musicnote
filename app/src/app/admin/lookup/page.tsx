import { requireRole } from "@/lib/guard";
import { listCustomerProfiles } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import StudentLookup from "./student-lookup";

export default async function StudentLookupPage() {
  await requireRole(["admin", "coordinator"]);
  const customers = listCustomerProfiles();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tra cứu học viên"
        subtitle="Gõ tên học viên, tên khách hàng, số điện thoại hoặc mã lớp để xem toàn bộ hồ sơ: tất cả các bé đang học, lớp, giáo viên, số tiết còn lại và học phí."
      />
      <Card padded={false}>
        <StudentLookup customers={customers} />
      </Card>
    </div>
  );
}
