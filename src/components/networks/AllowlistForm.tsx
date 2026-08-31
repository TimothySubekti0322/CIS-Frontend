"use client";

import { useState } from "react";
import type { AllowlistCategory } from "@/types/network";
import { strings } from "@/lib/constants/strings";
import {
  ALLOWLIST_CATEGORIES,
  MIN_ALLOWLIST_REASON,
} from "@/lib/constants/networkStatuses";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

export interface AllowlistDraft {
  category: AllowlistCategory;
  reason: string;
}

/**
 * US56's declaration form, shared by the network-level and account-level
 * actions.
 *
 * NGOs, newsrooms, unions and grassroots campaigns coordinate openly and by
 * design — a climate campaign posting a shared message at a shared time is
 * doing exactly what campaigns do. The category is required because the
 * distinction the detector has to make is between *declared* and *concealed*
 * coordination, and only a person can declare.
 */
export function AllowlistForm({
  onSubmit,
  onCancel,
  pending,
}: {
  onSubmit: (draft: AllowlistDraft) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [category, setCategory] = useState<AllowlistCategory>("ngo");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const tooShort = reason.trim().length < MIN_ALLOWLIST_REASON;

  return (
    <form
      className="space-y-3 rounded-lg border border-pale-sky bg-mint-cream p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (tooShort) return;
        onSubmit({ category, reason: reason.trim() });
      }}
    >
      <p className="text-xs text-regal-navy/70">{strings.networks.allowlistBody}</p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="allowlist-category"
          className="text-sm font-bold text-regal-navy"
        >
          {strings.networks.allowlistCategory}
        </label>
        <select
          id="allowlist-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as AllowlistCategory)}
          className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
        >
          {ALLOWLIST_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <TextArea
        label={strings.networks.allowlistReason}
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={strings.networks.allowlistReasonPlaceholder}
        error={touched && tooShort ? strings.networks.allowlistReasonTooShort : null}
      />

      <p className="text-xs text-regal-navy/60">
        {strings.networks.allowlistRetroactive}
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {strings.common.cancel}
        </Button>
        <Button type="submit" loading={pending} disabled={tooShort}>
          {strings.common.confirm}
        </Button>
      </div>
    </form>
  );
}
