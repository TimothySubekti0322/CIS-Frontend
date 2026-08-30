import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation + pointer affordance for clickable cards. */
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-pale-sky bg-white p-4",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-md focus-within:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
