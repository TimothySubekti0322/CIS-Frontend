import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "utility" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-sea-green text-white hover:bg-primary-hover hover:shadow-md disabled:bg-sea-green/50",
  secondary:
    "bg-white text-regal-navy border border-pale-sky hover:border-sea-green hover:bg-sea-green-soft hover:text-sea-green hover:shadow-sm disabled:opacity-50",
  // F4 test/MVP utility button (PRD §5.6)
  utility:
    "bg-glaucous text-white hover:bg-glaucous/90 hover:shadow-md disabled:opacity-50",
  ghost: "text-regal-navy hover:bg-pale-sky/40 disabled:opacity-50",
  danger:
    "bg-danger text-white hover:bg-danger/90 hover:shadow-md disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-150 ease-out",
        "hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
        "cursor-pointer",
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
