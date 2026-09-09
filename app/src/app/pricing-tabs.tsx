"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { PRICING } from "@/lib/types";
import { IconCheck, SubjectIcon } from "@/components/icons";

/** Làm tròn về nghìn cho gọn: 7.500.000 / 20 = 375.000đ mỗi buổi. */
function perSession(price: number, sessions: number): string {
  return formatVND(Math.round(price / sessions / 1000) * 1000);
}

export function PricingTabs() {
  const [active, setActive] = useState(PRICING[0].subject);
  const group = PRICING.find((p) => p.subject === active) ?? PRICING[0];

  // Mốc để tính "tiết kiệm bao nhiêu %": đơn giá của gói nhỏ nhất có giá.
  const baseTier = group.tiers.find((t) => t.price);
  const baseUnit = baseTier?.price ? baseTier.price / baseTier.sessions : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chọn bộ môn">
        {PRICING.map((p) => (
          <button
            key={p.subject}
            type="button"
            role="tab"
            aria-selected={p.subject === active}
            onClick={() => setActive(p.subject)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              p.subject === active
                ? "border-wood-700 bg-wood-700 text-white"
                : "border-navy-200 bg-white text-ink-700 hover:border-wood-300"
            }`}
          >
            <SubjectIcon
              subject={p.subject}
              className={`w-4 h-4 ${p.subject === active ? "text-white" : "text-wood-500"}`}
            />
            {p.subject}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-7 items-start">
        {group.tiers.map((tier) => {
          const featured = tier.badge === "Phổ biến nhất";
          // Chỉ gói rẻ nhất theo đơn giá mới khoe mức tiết kiệm — gói giữa tuy
          // cũng rẻ hơn gói nhỏ nhưng trang gốc không ghi, ghi thêm chỉ làm
          // loãng thông điệp của gói lớn.
          const saving =
            baseUnit && tier.price && tier.badge === "Tiết kiệm nhất"
              ? Math.round((1 - tier.price / tier.sessions / baseUnit) * 100)
              : 0;

          return (
            <div
              key={tier.sessions}
              className={`relative bg-white rounded-2xl p-5 sm:p-6 flex flex-col ${
                featured
                  ? "border-2 border-coral-400 shadow-lg md:-mt-2"
                  : "border border-navy-100"
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold text-white ${
                    featured ? "bg-coral-500" : "bg-wood-600"
                  }`}
                >
                  {tier.badge}
                </span>
              )}

              <p className="text-4xl font-bold text-ink-900 tabular leading-none">
                {tier.sessions}
              </p>
              <p className="text-sm text-ink-500 mt-1.5">
                buổi · {tier.name}
              </p>

              <p className="text-2xl font-bold text-ink-900 tabular mt-4">
                {tier.price ? formatVND(tier.price) : "Liên hệ"}
              </p>
              {tier.price && (
                <p className="text-xs text-ink-400 mt-1">
                  {tier.priceUSD ? `hoặc $${tier.priceUSD} USD · ` : "~"}
                  {perSession(tier.price, tier.sessions)}/buổi
                  {saving >= 5 ? ` · Tiết kiệm ~${saving}%` : ""}
                </p>
              )}

              {tier.features.length > 0 && (
                <ul className="mt-5 space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2 text-ink-700">
                      <IconCheck className="w-4 h-4 mt-0.5 shrink-0 text-coral-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              <a
                href="#hoc-thu"
                className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
                  featured
                    ? "bg-coral-600 hover:bg-coral-700 text-white"
                    : "border border-navy-200 text-ink-700 hover:bg-ivory-100"
                }`}
              >
                Đăng ký · {group.subject} {tier.sessions} buổi
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-ink-500 mt-7">
        ✦ Học thử 1 buổi miễn phí trước khi đăng ký gói · Không ràng buộc
      </p>
    </div>
  );
}
