"use client";

import { useMemo } from "react";
import { strings } from "@/lib/constants/strings";
import { useTopics } from "@/lib/hooks/useTopics";
import { FilterChips } from "@/components/ui/FilterChips";
import { Skeleton } from "@/components/ui/Skeleton";

export interface TopicFilterProps {
  selected: string[];
  onChange: (topicIds: string[]) => void;
  className?: string;
}

/**
 * Topic chips fed by `GET /topics`. Multi-select maps to a comma-separated
 * `topic_ids`; ranking is then computed over the merged pool, not top-N per
 * topic, so selecting two topics is one ranked list rather than two.
 */
export function TopicFilter({ selected, onChange, className }: TopicFilterProps) {
  const { data: topics, isPending } = useTopics();

  const options = useMemo(
    () =>
      (topics ?? []).map((t) => ({
        value: t.id,
        // The counts come from the same call — surface them on the chip.
        label: `${t.name} (${t.existingClaimCount + t.nonExistingClaimCount})`,
      })),
    [topics],
  );

  if (isPending) {
    return (
      <div className={className}>
        <Skeleton className="h-8 w-full max-w-xl" />
      </div>
    );
  }

  return (
    <FilterChips
      options={options}
      selected={selected}
      onChange={onChange}
      allLabel={strings.common.allTopics}
      aria-label="Filter by topic"
      className={className}
    />
  );
}
