import { requireRole } from "@/lib/guard";
import { listMessageThreads } from "@/lib/queries";
import { Card, PageHeader } from "@/components/ui";
import { IconChat } from "@/components/icons";
import ThreadList from "@/components/thread-list";

export default async function StudentMessagesPage() {
  const session = await requireRole(["student"]);
  const threads = listMessageThreads(session.userId, "student");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tin nhắn"
        subtitle="Hỏi bài, báo bận hay trao đổi với giáo viên của từng lớp."
      />
      <Card padded={false}>
        <ThreadList
          threads={threads}
          basePath="/student/messages"
          emptyTitle="Chưa có lớp nào"
          emptyHint="Khi bạn có lớp đang học, khung chat với giáo viên sẽ hiện ở đây."
          icon={<IconChat className="w-6 h-6" />}
        />
      </Card>
    </div>
  );
}
