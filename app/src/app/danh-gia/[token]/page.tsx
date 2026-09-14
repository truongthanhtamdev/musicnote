import { notFound } from "next/navigation";
import { getRatingInvite } from "@/lib/queries";
import { ContactButtons } from "@/components/contact-buttons";
import RatingForm from "./rating-form";

/**
 * Trang khách chấm sao, mở bằng link gửi qua Zalo sau buổi học.
 *
 * Không nằm sau đăng nhập và không có menu — khách mở trên điện thoại, thấy
 * đúng một việc phải làm.
 */
export default async function RatingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = getRatingInvite(token);
  if (!invite) notFound();

  const [y, m, d] = invite.sessionDate.split("-");

  return (
    <main className="min-h-screen bg-ivory-100 px-4 py-8 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-wood-600 uppercase">
            Piano Guitar Đệm Hát
          </p>
          <h1 className="text-xl font-bold text-ink-900 mt-1">Đánh giá buổi học</h1>
        </div>

        <div className="bg-white rounded-2xl border border-navy-100 p-5 space-y-4">
          <div className="text-center">
            <p className="text-ink-900 font-semibold">
              {invite.subject} · {invite.studentName}
            </p>
            <p className="text-sm text-ink-500 mt-0.5 tabular">
              Buổi ngày {d}/{m}/{y} · giáo viên {invite.teacherName}
            </p>
          </div>

          <RatingForm
            token={token}
            current={invite.rating?.stars ?? null}
            currentComment={invite.rating?.comment ?? null}
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-ink-500 mb-2">Cần hỗ trợ thêm?</p>
          <ContactButtons label="" />
        </div>
      </div>
    </main>
  );
}
