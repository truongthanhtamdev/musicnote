import Link from "next/link";
import { requireRole } from "@/lib/guard";
import { getUserById } from "@/lib/auth";
import { IconKey, IconUser } from "@/components/icons";
import { Card, CardHeader, PageHeader, btn } from "@/components/ui";
import ProfileForm from "./profile-form";

/**
 * Hồ sơ khách tự điền. Lớp nhập từ file Excel của trung tâm nên thiếu nhiều
 * thông tin liên hệ; để khách tự bổ sung một lần nhanh hơn nhiều so với giáo
 * vụ đi hỏi từng nhà.
 */
export default async function MyProfilePage() {
  const session = await requireRole(["student"]);
  const me = getUserById(session.userId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thông tin của tôi"
        subtitle="Điền giúp trung tâm mấy thông tin này để liên hệ khi có thay đổi lịch học. Những ô trung tâm chưa có sẽ được cập nhật theo thông tin bạn điền."
      />

      <Card padded={false}>
        <CardHeader
          title="Thông tin liên hệ"
          icon={<IconUser className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5">
          <ProfileForm
            profile={{
              name: me?.name ?? "",
              phone: me?.phone ?? "",
              facebookUrl: me?.facebook_url ?? "",
              address: me?.address ?? "",
              note: me?.note ?? "",
            }}
          />
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader
          title="Đăng nhập & mật khẩu"
          icon={<IconKey className="w-4.5 h-4.5 text-wood-500" />}
        />
        <div className="p-5 space-y-3">
          <p className="text-sm text-ink-600">
            Bạn đang đăng nhập bằng{" "}
            <span className="font-semibold text-ink-900 tabular">{me?.email}</span>. Mã lớp trung
            tâm cấp cũng đăng nhập được.
          </p>
          <Link href="/account/password" className={btn.secondary}>
            Đổi mật khẩu
          </Link>
        </div>
      </Card>
    </div>
  );
}
