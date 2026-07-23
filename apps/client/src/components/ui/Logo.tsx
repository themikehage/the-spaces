interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = "", size = 26 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-label="Spaces"
    >
      <circle cx="8" cy="16" r="2.5" className="fill-primary" />
      <circle cx="16" cy="8" r="2.5" className="fill-primary" />
      <circle cx="24" cy="8" r="2.5" className="fill-primary" />
      <circle cx="16" cy="24" r="2.5" className="fill-primary" />
      <circle cx="24" cy="24" r="2.5" className="fill-primary" />
      <line x1="10" y1="16" x2="14" y2="8" className="stroke-primary/70" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="8" x2="22" y2="8" className="stroke-primary/70" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="22" y2="24" className="stroke-primary/70" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="8" x2="14" y2="24" className="stroke-primary/70" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="8" x2="22" y2="24" className="stroke-primary/70" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
