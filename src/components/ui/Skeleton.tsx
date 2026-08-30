import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-pale-sky/60", className)}
      aria-hidden
    />
  );
}

/** A grid of card-shaped skeletons for list/section loading states. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-pale-sky bg-white p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-4 h-6 w-24" />
        </div>
      ))}
    </div>
  );
}
