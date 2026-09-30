import { getCenterContact } from "@/lib/queries";
import { getCenterChannels, type ClipRow } from "@/lib/clips";
import { ClipPlayer } from "@/components/clip-player";
import { TrackedLink } from "@/components/tracked-link";
import { IconChevronRight, IconFacebook, IconPlay, IconVideo } from "@/components/icons";

/**
 * Clip học viên thật trên trang chủ — khách xem ngay tại đây, bấm sang kênh
 * của trung tâm nếu muốn xem thêm, và nút học thử nằm ngay dưới để xem xong
 * là đăng ký luôn, khỏi cuộn đi tìm.
 */
export function ClipShowcase({ clips }: { clips: ClipRow[] }) {
  if (clips.length === 0) return null;
  const wide = clips.filter((c) => !c.vertical);
  const tall = clips.filter((c) => c.vertical);
  const channels = getCenterChannels();
  const { facebook } = getCenterContact();
  const channelLinks = [
    channels.youtube && { href: channels.youtube, label: "YouTube", event: "mo_kenh_youtube", icon: <IconPlay className="w-4 h-4" /> },
    channels.tiktok && { href: channels.tiktok, label: "TikTok", event: "mo_kenh_tiktok", icon: <IconVideo className="w-4 h-4" /> },
    facebook && { href: facebook, label: "Facebook", event: "mo_kenh_facebook", icon: <IconFacebook className="w-4 h-4" /> },
  ].filter(Boolean) as { href: string; label: string; event: string; icon: React.ReactNode }[];

  return (
    <section id="clip" className="scroll-mt-20 max-w-6xl mx-auto px-5 sm:px-8 pb-12 sm:pb-16">
      <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
        Học viên của trung tâm
      </h2>
      <p className="text-ink-500 mt-2">Clip thật của học viên sau một thời gian học 1 kèm 1.</p>

      {/* Video ngang và Shorts dọc để hai lưới riêng — trộn chung thì ô cao ô
          thấp, hàng nào cũng lệch. */}
      {wide.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0 gap-4 sm:gap-5 mt-7">
          {wide.map((c) => (
            <ClipFigure key={c.id} clip={c} />
          ))}
        </div>
      )}
      {tall.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 [&>*]:min-w-0 gap-3 sm:gap-4 mt-7">
          {tall.map((c) => (
            <ClipFigure key={c.id} clip={c} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">Bạn (hoặc con bạn) cũng muốn đàn hát được như vậy?</p>
          {channelLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-sm text-ink-500">Xem thêm clip trên kênh:</span>
              {channelLinks.map((l) => (
                <TrackedLink
                  key={l.label}
                  href={l.href}
                  event={l.event}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white hover:bg-ivory-100 px-3 py-1.5 text-sm font-semibold text-ink-700 transition"
                >
                  {l.icon}
                  {l.label}
                </TrackedLink>
              ))}
            </div>
          )}
        </div>
        <a
          href="#hoc-thu"
          className="inline-flex items-center gap-1.5 rounded-xl bg-coral-600 hover:bg-coral-700 text-white px-6 py-3 font-semibold transition"
        >
          Đăng ký học thử miễn phí
          <IconChevronRight className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}

function ClipFigure({ clip }: { clip: ClipRow }) {
  return (
    <figure>
      <ClipPlayer clip={clip} />
      {(clip.title || clip.subject) && (
        <figcaption className="mt-2 text-sm leading-snug">
          {clip.title && <span className="font-medium text-ink-900">{clip.title}</span>}
          {clip.subject && (
            <span className="block text-xs text-wood-600 font-semibold mt-0.5">{clip.subject}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
