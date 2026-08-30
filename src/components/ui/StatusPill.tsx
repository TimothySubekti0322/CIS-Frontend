import { cn } from "@/lib/utils";

export type PillTone = "success" | "neutral" | "info" | "warn" | "danger" | "muted";

const TONES: Record<PillTone, string> = {
  success: "bg-mint-leaf-soft text-sea-green",
  neutral: "bg-glaucous-soft text-regal-navy",
  info: "bg-frosted-blue-soft text-regal-navy",
  warn: "bg-gold-soft text-regal-navy",
  danger: "bg-danger-soft text-danger",
  muted: "bg-pale-sky text-regal-navy",
};

export interface StatusPillProps {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

/** One pill component for every status/badge in the app (claim status, policy status, threshold status, dormant, processing). */
export function StatusPill({ tone, children, className, icon }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
