import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { canUseClassChat, getClass, listClassMessages } from "@/lib/queries";
import { formatClassSchedule } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { JoinClassLink } from "@/components/join-class-link";
import ClassChat from "@/components/class-chat";

export default async function TeacherThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["teacher"]);
  const cls = getClass(Number((await params).id));
  if (!cls || !canUseClassChat(cls, session.userId, "teacher")) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={cls.student_name}
        subtitle={`${cls.subject} · ${formatClassSchedule(cls)}`}
        action={
          <div className="flex items-center gap-2">
            <JoinClassLink url={cls.meeting_url} />
            <Link href="/teacher/messages" className="text-sm font-semibold text-wood-600">
              ← Tất cả tin nhắn
            </Link>
          </div>
        }
      />
      <Card padded={false}>
        <ClassChat classId={cls.id} messages={listClassMessages(cls.id)} meId={session.userId} />
      </Card>
    </div>
  );
}
