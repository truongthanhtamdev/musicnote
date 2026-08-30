export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9cd9a" />
          <stop offset="100%" stopColor="#a87c3f" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="41" fill="none" stroke="url(#logo-gold)" strokeWidth="6" />
      <path
        d="M 69 37 A 24 24 0 1 0 69 63"
        fill="none"
        stroke="url(#logo-gold)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line x1="18" y1="58" x2="82" y2="45" stroke="url(#logo-gold)" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
