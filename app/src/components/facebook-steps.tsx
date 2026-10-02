import { FbAppLink } from "./fb-app-link";
import { IconChat, IconFacebook } from "./icons";
import { messengerUrl } from "@/lib/facebook-links";

/**
 * Hai nút "kết bạn Facebook thầy Tâm" và "nhắn Messenger" — trung tâm sắp lớp
 * và lập nhóm lớp qua Facebook, nên đây là bước khách cần làm sau khi đăng ký.
 */
export function FacebookSteps({ facebookUrl }: { facebookUrl: string | null }) {
  if (!facebookUrl) return null;
  const messenger = messengerUrl(facebookUrl);
  return (
    <div className="flex flex-wrap gap-2">
      <FbAppLink
        href={facebookUrl}
        event="ket_ban_facebook"
        className="inline-flex items-center gap-2 rounded-xl bg-[#1877f2] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
      >
        <IconFacebook className="w-4 h-4" />
        Kết bạn Facebook thầy Tâm
      </FbAppLink>
      {messenger && messenger !== facebookUrl && (
        <FbAppLink
          href={messenger}
          event="nhan_messenger"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00B2FF] to-[#A033FF] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
        >
          <IconChat className="w-4 h-4" />
          Nhắn Messenger
        </FbAppLink>
      )}
    </div>
  );
}
