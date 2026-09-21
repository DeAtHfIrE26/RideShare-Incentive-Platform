import { cn } from "@/lib/utils";

/**
 * The RideShare mark. Kept as inline SVG rather than an <img> so it inherits
 * colour from the surrounding text and stays crisp at any size. The same
 * artwork is in client/public/favicon.svg for the browser tab.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="RideShare"
    >
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path
        d="M17 34 L19.4 25.2 C20.1 22.7 22.4 21 25 21 H39 C41.6 21 43.9 22.7 44.6 25.2 L47 34 Z"
        className="fill-background"
      />
      <rect x="12" y="32" width="40" height="13" rx="5" className="fill-background" />
      <circle cx="22" cy="46" r="5.5" className="fill-background" />
      <circle cx="42" cy="46" r="5.5" className="fill-background" />
      <circle cx="22" cy="46" r="2.4" fill="currentColor" />
      <circle cx="42" cy="46" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** Mark plus wordmark, for headers and the auth screen. */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="font-semibold tracking-tight">RideShare</span>
    </span>
  );
}
