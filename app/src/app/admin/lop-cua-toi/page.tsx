import { requireRole } from "@/lib/guard";
import { listCoordinatorClasses } from "@/lib/queries";
import { ADMIN_AREA_ROLES, classStage, shortDayLabel } from "@/lib/types";
import { MetricCard, PageHeader } from "@/components/ui";
import MyClassList from "./my-class-list";

/**
 * Lớp của nhân viên đặt hẹn: mọi khách họ đã đặt hẹn, kèm tình trạng (chờ học
 * thử, học thử xong chờ chốt, đang học, tạm nghỉ, không học), đã đóng tiền
 * chưa, đã có thưởng chưa. Mỗi người chỉ thấy khách của mình.
 */
export default async function MyClassesPage() {
  const session = await requireRole(ADMIN_AREA_ROLES);
  const rows = listCoordinatorClasses(session.userId).map((r) => ({
    ...r,
    stageLabel: classStage(r.stage).label,
    stageClass: classStage(r.stage).className,
    trialLabel: r.trialDate ? shortDayLabel(r.trialDate) : null,
    nextLabel: r.nextDate ? shortDayLabel(r.nextDate) : null,
    lastLabel: r.lastDate ? shortDayLabel(r.lastDate) : null,
    pausedLabel: r.pausedUntil ? shortDayLabel(r.pausedUntil) : null,
    createdLabel: shortDayLabel(r.createdAt.slice(0, 10)),
  }));

  const total = rows.length;
  const tried = rows.filter((r) => r.trialDate || r.group === "studying").length;
  const converted = rows.filter((r) => r.group === "studying" || r.bonusConversion || r.paid).length;
  const rate = tried ? Math.round((converted / tried) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lớp của tôi"
        subtitle="Các khách bạn đã đặt hẹn và tình trạng hiện tại — học thử chưa, có chốt lớp không, đã đóng tiền chưa."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Khách đã đặt hẹn" value={total} unit="khách" />
        <MetricCard label="Đã học thử" value={tried} unit="khách" />
        <MetricCard label="Đã chốt lớp" value={converted} unit="khách" tone="mint" />
        <MetricCard label="Tỉ lệ chốt" value={`${rate}%`} hint="trên số khách đã học thử" />
      </div>
      <MyClassList rows={rows} />
    </div>
  );
}
