import Link from "next/link";
import { requireRole } from "@/lib/guard";
import {
  listNotStudyingCustomers,
  listPaymentFollowUps,
  type FollowUpKind,
  type PaymentFollowUp,
} from "@/lib/queries";
import { MANAGE_ROLES, shortDayLabel } from "@/lib/types";
import { formatVND, todayISO } from "@/lib/format";
import { IconCheckCircle, IconFacebook } from "@/components/icons";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import ClassStatusBadge from "../classes/status-badge";
import NotStudyingButton from "./not-studying-button";
import MarkPaidButton from "./mark-paid-button";

const SECTIONS: { kind: FollowUpKind; title: string; hint: string }[] = [
  {
    kind: "trial_done",
    title: "Đã học thử — chờ chốt đóng học phí",
    hint: "Gọi / nhắn ngay sau buổi học thử là dễ chốt nhất. Học thử xong càng lâu càng nằm trên đầu.",
  },
  {
    kind: "trial_upcoming",
    title: "Sắp học thử",
    hint: "Nhắc khách giờ học và gửi link Meet trước buổi học thử.",
  },
  {
    kind: "unpaid",
    title: "Lớp mới / đang học — chưa đóng đủ học phí",
    hint: `Lớp tạo trong 30 ngày gần đây chưa thu, hoặc đang ở trạng thái "chưa đóng / chưa hoàn thành HP", "báo / chờ đóng HP khóa mới".`,
  },
  {
    kind: "not_studying",
    title: "Khách không học",
    hint: "Khách học thử xong không học / đã nghỉ trong 90 ngày gần đây — để chăm lại khi có lớp mới, ưu đãi. Khách muốn học lại thì mở trang khách, đổi trạng thái.",
  },
];

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / 86_400_000
  );
}

/**
 * Chăm khách đóng học phí: một trang để giáo vụ đi một vòng mỗi ngày — khách
 * vừa học thử, khách sắp học thử, lớp mới chưa đóng tiền. Bấm tên là mở
 * trang khách (ghi khoản thu, đổi trạng thái), SĐT bấm là gọi.
 */
export default async function PaymentFollowUpPage() {
  // Bấm tên là mở trang lớp — trang đó chỉ Quản lý trở lên vào được.
  await requireRole(MANAGE_ROLES);
  const showMoney = true;
  const items = [...listPaymentFollowUps(), ...listNotStudyingCustomers()];
  const today = todayISO();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chăm khách đóng học phí"
        subtitle="Khách học thử và lớp mới cần theo dõi tới khi đóng học phí. Đóng đủ hoặc chuyển trạng thái là tự rời khỏi danh sách."
      />

      {SECTIONS.map((sec) => {
        const rows = items.filter((i) => i.kind === sec.kind);
        return (
          <Card key={sec.kind} padded={false}>
            <CardHeader title={sec.title} count={rows.length} />
            <p className="px-5 pt-3 text-xs text-ink-500">{sec.hint}</p>
            {rows.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-400 flex items-center gap-2">
                <IconCheckCircle className="w-4 h-4 text-mint-500" /> Không có khách nào ở mục này.
              </p>
            ) : (
              <ul className="divide-y divide-navy-100 mt-2">
                {rows.map((r) => (
                  <FollowUpRow key={r.classId} r={r} today={today} showMoney={showMoney} />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function FollowUpRow({ r, today, showMoney }: { r: PaymentFollowUp; today: string; showMoney: boolean }) {
  let when = "";
  if (r.kind === "trial_done" && r.trialDate) {
    const d = daysBetween(r.trialDate, today);
    when = `Học thử ${shortDayLabel(r.trialDate)} · ${d <= 0 ? "hôm nay" : `${d} ngày trước`}`;
  } else if (r.kind === "trial_upcoming") {
    when = r.nextDate ? `Học thử ${shortDayLabel(r.nextDate)}` : "Chưa có lịch học thử";
  } else if (r.kind === "not_studying") {
    when = [
      r.trialDate ? `Học thử ${shortDayLabel(r.trialDate)}` : "",
      r.regularSessions ? `đã học ${r.regularSessions} buổi` : "",
      r.nextDate ? `hoạt động cuối ${shortDayLabel(r.nextDate)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    const d = daysBetween(r.createdAt.slice(0, 10), today);
    when = `Tạo lớp ${d <= 0 ? "hôm nay" : `${d} ngày trước`}${r.regularSessions ? ` · đã học ${r.regularSessions} buổi` : ""}`;
  }
  const urgent = r.kind === "trial_done" && r.trialDate && daysBetween(r.trialDate, today) >= 3;

  return (
    <li className="px-5 py-3.5 flex flex-wrap items-start gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1 basis-64">
        <Link href={`/admin/classes/${r.classId}`} className="font-semibold text-ink-900 hover:text-wood-600 hover:underline">
          {r.name}
        </Link>
        {r.guardian && r.guardian !== r.name && <span className="text-sm text-ink-500"> · PH {r.guardian}</span>}
        <p className="text-sm text-ink-600 mt-0.5">
          {r.subject}
          {r.schedule && <span className="tabular"> · {r.schedule}</span>}
          {r.teacherName ? ` · GV ${r.teacherName}` : " · Chưa xếp GV"}
        </p>
        <p className={`text-xs mt-1 tabular ${urgent ? "text-coral-700 font-semibold" : "text-ink-500"}`}>
          {when}
          {r.coordinatorName && <span className="text-ink-400 font-normal"> · Giáo vụ: {r.coordinatorName}</span>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ClassStatusBadge stage={r.stage} />
        {showMoney && r.kind !== "not_studying" && (
          <span className="tabular text-xs text-ink-600">
            {r.paid > 0
              ? `Đã thu ${formatVND(r.paid)}${r.expected ? ` / ${formatVND(r.expected)}` : ""}`
              : "Chưa thu"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm basis-full sm:basis-auto">
        {r.phone && (
          <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-navy-700 hover:underline tabular">
            📞 {r.phone}
          </a>
        )}
        {r.facebook && (
          <a
            href={r.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline"
          >
            <IconFacebook className="w-4 h-4" /> Facebook
          </a>
        )}
        {r.kind !== "not_studying" && r.kind !== "trial_upcoming" && <MarkPaidButton classId={r.classId} name={r.name} />}
        {r.kind !== "not_studying" && <NotStudyingButton classId={r.classId} name={r.name} />}
        <Link href={`/admin/classes/${r.classId}`} className="font-semibold text-wood-600 hover:text-wood-700">
          Mở trang khách →
        </Link>
      </div>
    </li>
  );
}
