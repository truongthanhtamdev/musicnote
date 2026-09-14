import { requireRole } from "@/lib/guard";
import { listMessageThreads } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { IconChat } from "@/components/icons";
import ThreadList from "@/components/thread-list";

export default async function TeacherMessagesPage() {
  const session = await requireRole(["teacher"]);
  const threads = listMessageThreads(session.userId, "teacher");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tin nhắn"
        subtitle="Trao đổi với học viên và phụ huynh của từng lớp. Giáo vụ trung tâm cũng đọc được."
      />
      <Card padded={false}>
        <ThreadList
          threads={threads}
          basePath="/teacher/messages"
          emptyTitle="Chưa có lớp nào để nhắn"
          emptyHint="Khi bạn được giao lớp, mỗi lớp sẽ có một khung chat riêng ở đây."
          icon={<IconChat className="w-6 h-6" />}
        />
      </Card>
    </div>
  );
}
