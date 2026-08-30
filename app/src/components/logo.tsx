export function Logo({ className = "h-8" }: { className?: string }) {
  // Width is intentionally left to the image's natural aspect ratio — pass
  // only height/layout utilities (h-*, shrink-0, mx-auto...) in `className`.
  // eslint-disable-next-line @next/next/no-img-element -- fixed static asset, used at small decorative sizes across pages
  return <img src="/logo-mark.png" alt="" className={className} />;
}
