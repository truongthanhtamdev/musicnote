import { requireRole } from "@/lib/guard";
import { ADMIN_AREA_ROLES, MANAGE_ROLES } from "@/lib/types";
import { HOME_CLIP_LIMIT, getCenterChannels, listClips } from "@/lib/clips";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { IconVideo } from "@/components/icons";
import AddClipForm from "./add-clip-form";
import ChannelsForm from "./channels-form";
import ClipItem from "./clip-item";

export default async function ClipAdminPage() {
  const session = await requireRole(ADMIN_AREA_ROLES);
  const clips = listClips();
  const shown = clips.filter((c) => c.is_public).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clip học viên"
        subtitle="Đăng clip lên YouTube / TikTok / Facebook như bình thường, rồi dán link vào đây — clip hiện ngay ở trang chủ, ngay trên nút đăng ký học thử."
      />

      <Card padded={false}>
        <CardHeader title="Thêm clip" icon={<IconVideo className="w-5 h-5" />} />
        <div className="p-4 sm:p-5">
          <AddClipForm />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title="Clip đã thêm" count={clips.length} />
        {clips.length === 0 ? (
          <EmptyState
            icon={<IconVideo className="w-7 h-7" />}
            title="Chưa có clip nào"
            description="Dán link clip đầu tiên ở trên — trang chủ chỉ hiện mục clip khi đã có ít nhất một clip được bật hiện."
          />
        ) : (
          <div className="p-4 sm:p-5">
            <p className="text-sm text-ink-500 mb-4">
              Trang chủ hiện <b>{HOME_CLIP_LIMIT} clip mới nhất</b> đang bật &quot;Hiện trên trang chủ&quot; (đang bật: {shown}).
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [&>*]:min-w-0 gap-4 items-start">
              {clips.map((c) => (
                <ClipItem key={c.id} clip={c} />
              ))}
            </ul>
          </div>
        )}
      </Card>

      {MANAGE_ROLES.includes(session.role) && (
        <Card padded={false}>
          <CardHeader title="Kênh của trung tâm" />
          <div className="p-4 sm:p-5">
            <ChannelsForm channels={getCenterChannels()} />
          </div>
        </Card>
      )}
    </div>
  );
}
