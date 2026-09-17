import { beatLabels, type StrumPattern, type StrumStep } from "@/lib/strum";

/** Ký hiệu hiện trong ô: mũi tên cho quạt, số dây cho rải. */
function stepSymbol(step: StrumStep): { text: string; title: string } | null {
  switch (step.kind) {
    case "down":
      return { text: "↓", title: "Quạt xuống" };
    case "up":
      return { text: "↑", title: "Quạt lên" };
    case "bass":
      return { text: "B", title: "Đánh dây bass của hợp âm" };
    case "mute":
      return { text: "×", title: "Chặn tiếng — nghe 'chát' khô" };
    case "pluck":
      return { text: String(step.string), title: `Khảy dây ${step.string}` };
    case "rest":
      return null;
  }
}

/**
 * Lưới một ô nhịp của điệu đệm.
 *
 * Vẽ thành lưới đều thay vì mô tả bằng lời ("chát bùm chát chát") vì người
 * mới cần đếm được: mỗi cột là một khoảng thời gian bằng nhau, cột nào có ký
 * hiệu thì đánh, cột trống thì tay vẫn vung qua nhưng không chạm dây.
 */
export function StrumGrid({ pattern }: { pattern: StrumPattern }) {
  const labels = beatLabels(pattern);

  return (
    <div className="overflow-x-auto scroll-thin -mx-1 px-1">
      <div
        className="grid gap-1 min-w-max"
        style={{ gridTemplateColumns: `repeat(${pattern.steps.length}, minmax(34px, 1fr))` }}
      >
        {labels.map((label, i) => (
          <div
            key={`l${i}`}
            className={`text-center text-xs font-semibold tabular ${
              label === "&" ? "text-ink-400" : "text-ink-700"
            }`}
          >
            {label}
          </div>
        ))}

        {pattern.steps.map((step, i) => {
          const sym = stepSymbol(step);
          const startsBeat = i % pattern.perBeat === 0;
          return (
            <div
              key={`s${i}`}
              title={sym?.title}
              className={`h-11 rounded-lg border flex items-center justify-center text-lg font-bold ${
                !sym
                  ? "border-dashed border-navy-200 bg-ivory-50 text-ink-300"
                  : step.accent
                    ? "border-wood-600 bg-wood-600 text-white"
                    : startsBeat
                      ? "border-navy-300 bg-white text-ink-900"
                      : "border-navy-200 bg-ivory-50 text-ink-700"
              }`}
            >
              {sym ? sym.text : "·"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Chú giải ký hiệu, để ngay dưới lưới đầu tiên là đủ cho cả trang. */
export function StrumLegend() {
  const items: [string, string][] = [
    ["B", "đánh dây bass của hợp âm"],
    ["↓", "quạt xuống"],
    ["↑", "quạt lên"],
    ["×", "chặn tiếng, nghe khô"],
    ["1–6", "khảy riêng dây số mấy"],
    ["·", "nghỉ — tay vẫn vung qua, không chạm dây"],
  ];
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
      {items.map(([sym, text]) => (
        <div key={sym} className="flex items-center gap-1.5">
          <dt className="font-bold text-ink-900 min-w-6 text-center">{sym}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}
