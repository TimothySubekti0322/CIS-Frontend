"use client";

import { useState } from "react";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { AllowlistCategory, AllowlistEntry } from "@/types/network";
import { ApiError } from "@/types/common";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  ALLOWLIST_CATEGORIES,
  ALLOWLIST_CATEGORY_LABELS,
  MIN_ALLOWLIST_REASON,
  PHRASE_CATEGORIES,
} from "@/lib/constants/networkStatuses";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  useAllowlist,
  useAllowlistCategories,
  useCommonPhrases,
  useCreateAllowlistEntry,
  useCreateCommonPhrase,
  useDeleteCommonPhrase,
  useRemoveAllowlistEntry,
} from "@/lib/hooks/useDetector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import {
  DetectorUnavailable,
  isDetectorUnavailable,
} from "@/components/networks/DetectorUnavailable";

/**
 * US63 — managing the declared-coordination allowlist.
 *
 * This screen is product-critical rather than administrative housekeeping.
 * NGOs, newsrooms, unions and grassroots campaigns coordinate openly and by
 * design; without this list the detector systematically flags civil society,
 * which for a government-operated tool is the most serious failure mode there
 * is. US63 asks for it to be seeded during onboarding — before the first
 * detection run, not after the first false positive.
 */
export function AllowlistManager() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AllowlistCategory | "">("");
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AllowlistEntry | null>(null);

  const debounced = useDebouncedValue(search, 300);
  const { data, isPending, error } = useAllowlist({
    q: debounced || undefined,
    category: category || undefined,
    includeRemoved: includeRemoved || undefined,
    page,
    limit: 20,
  });
  const { data: counts } = useAllowlistCategories();
  const remove = useRemoveAllowlistEntry();

  if (isDetectorUnavailable(error)) {
    return <DetectorUnavailable error={error} />;
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3">{strings.allowlist.title}</h2>
            <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
              {strings.allowlist.description}
            </p>
          </div>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            {strings.allowlist.add}
          </Button>
        </div>

        {counts && Object.keys(counts).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(counts).map(([key, value]) => (
              <StatusPill key={key} tone="muted">
                {ALLOWLIST_CATEGORY_LABELS[key] ?? key}: {value}
              </StatusPill>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={strings.allowlist.search}
            className="min-w-48 flex-1"
          />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as AllowlistCategory | "");
              setPage(1);
            }}
            className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
            aria-label={strings.allowlist.category}
          >
            <option value="">{strings.common.allStatus}</option>
            {ALLOWLIST_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-regal-navy">
            <input
              type="checkbox"
              checked={includeRemoved}
              onChange={(e) => {
                setIncludeRemoved(e.target.checked);
                setPage(1);
              }}
              className="size-4 accent-sea-green"
            />
            {strings.allowlist.includeRemoved}
          </label>
        </div>

        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title={strings.allowlist.empty} />
        ) : (
          <>
            <div className="scroll-x">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-pale-sky text-left text-xs text-regal-navy/70">
                    <th className="px-2 py-2">{strings.allowlist.handle}</th>
                    <th className="px-2 py-2">{strings.allowlist.platform}</th>
                    <th className="px-2 py-2">{strings.allowlist.category}</th>
                    <th className="px-2 py-2">{strings.allowlist.reason}</th>
                    <th className="px-2 py-2">Added</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-pale-sky/60 align-top"
                    >
                      <td className="px-2 py-2 font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck
                            className="size-3.5 text-sea-green"
                            aria-hidden
                          />
                          {entry.handle}
                        </span>
                        {/* The platform-issued id is what the entry is really
                            keyed on — a renamed handle must not lapse it. */}
                        <span className="block font-mono text-[11px] font-normal text-regal-navy/40">
                          {entry.platformAccountId}
                        </span>
                      </td>
                      <td className="px-2 py-2">{entry.platform}</td>
                      <td className="px-2 py-2">
                        {ALLOWLIST_CATEGORY_LABELS[entry.category] ?? entry.category}
                      </td>
                      <td className="max-w-xs px-2 py-2 text-xs text-regal-navy/70">
                        {entry.reason}
                        {!entry.active && entry.removalReason && (
                          <span className="mt-1 block text-danger">
                            {strings.allowlist.removeReason}: {entry.removalReason}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-regal-navy/60">
                        {formatDate(entry.addedAt)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {entry.active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoving(entry)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        ) : (
                          <StatusPill tone="muted">
                            {strings.allowlist.inactive}
                          </StatusPill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={data.meta} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CommonPhrasesCard />

      <AddEntryModal open={adding} onClose={() => setAdding(false)} />

      <RemoveEntryModal
        entry={removing}
        pending={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={async (reason) => {
          if (!removing) return;
          try {
            await remove.mutateAsync({ id: removing.id, reason });
            toast(strings.allowlist.removed);
            setRemoving(null);
          } catch (err) {
            toast(
              err instanceof ApiError ? err.message : strings.errors.generic,
              "error",
            );
          }
        }}
      />
    </div>
  );
}

function AddEntryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const create = useCreateAllowlistEntry();
  const [platform, setPlatform] = useState("");
  const [accountId, setAccountId] = useState("");
  const [handle, setHandle] = useState("");
  const [category, setCategory] = useState<AllowlistCategory>("ngo");
  const [reason, setReason] = useState("");

  const valid =
    platform.trim() &&
    accountId.trim() &&
    handle.trim() &&
    reason.trim().length >= MIN_ALLOWLIST_REASON;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={strings.allowlist.addTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button
            loading={create.isPending}
            disabled={!valid}
            onClick={async () => {
              try {
                await create.mutateAsync({
                  platform: platform.trim(),
                  platformAccountId: accountId.trim(),
                  handle: handle.trim(),
                  category,
                  reason: reason.trim(),
                });
                toast(strings.allowlist.added);
                setPlatform("");
                setAccountId("");
                setHandle("");
                setReason("");
                onClose();
              } catch (err) {
                toast(
                  err instanceof ApiError ? err.message : strings.errors.generic,
                  "error",
                );
              }
            }}
          >
            {strings.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field
          label={strings.allowlist.platform}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="x"
        />
        <Field
          label={strings.allowlist.platformAccountId}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          hint={strings.allowlist.platformAccountIdHint}
        />
        <Field
          label={strings.allowlist.handle}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@example_ngo"
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="allowlist-add-category"
            className="text-sm font-bold text-regal-navy"
          >
            {strings.allowlist.category}
          </label>
          <select
            id="allowlist-add-category"
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
          label={strings.allowlist.reason}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={strings.networks.allowlistReasonPlaceholder}
        />
      </div>
    </Modal>
  );
}

/**
 * Removal is what lets the detector flag an organisation again, so its reason
 * is required — and stored separately from the addition reason, because
 * overwriting the latter would destroy the record of why the entry existed.
 */
function RemoveEntryModal({
  entry,
  pending,
  onClose,
  onConfirm,
}: {
  entry: AllowlistEntry | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < MIN_ALLOWLIST_REASON;

  return (
    <Modal
      open={Boolean(entry)}
      onClose={onClose}
      title={strings.allowlist.removeTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={tooShort}
            onClick={() => onConfirm(reason.trim())}
          >
            {strings.allowlist.remove}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-regal-navy/70">{strings.allowlist.removeBody}</p>
        {entry && (
          <p className="rounded-lg bg-mint-cream px-3 py-2 text-sm font-bold text-regal-navy">
            {entry.handle} · {entry.platform}
          </p>
        )}
        <TextArea
          label={strings.allowlist.removeReason}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={
            reason && tooShort ? strings.networks.allowlistReasonTooShort : null
          }
        />
      </div>
    </Modal>
  );
}

/**
 * PRD 10.5.2.2's phrase list. A shared campaign hashtag is not content
 * duplication, and without this exclusion the duplication signal reads every
 * protest slogan as coordination.
 */
function CommonPhrasesCard() {
  const { toast } = useToast();
  const { data, isPending } = useCommonPhrases();
  const create = useCreateCommonPhrase();
  const remove = useDeleteCommonPhrase();
  const [phrase, setPhrase] = useState("");
  const [category, setCategory] = useState("slogan");

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-h3">{strings.allowlist.phrasesTitle}</h2>
        <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
          {strings.allowlist.phrasesDescription}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field
          label={strings.allowlist.phrase}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="min-w-56"
        />
        <div className="flex flex-col gap-1">
          <label
            htmlFor="phrase-category"
            className="text-sm font-bold text-regal-navy"
          >
            {strings.allowlist.category}
          </label>
          <select
            id="phrase-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
          >
            {PHRASE_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          loading={create.isPending}
          disabled={phrase.trim().length < 3}
          onClick={async () => {
            try {
              await create.mutateAsync({ phrase: phrase.trim(), category });
              setPhrase("");
              toast(strings.allowlist.phraseAdded);
            } catch (err) {
              toast(
                err instanceof ApiError ? err.message : strings.errors.generic,
                "error",
              );
            }
          }}
        >
          {strings.allowlist.addPhrase}
        </Button>
      </div>

      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.allowlist.noPhrases}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-pale-sky bg-white py-1 pl-3 pr-1 text-sm"
            >
              <span className="text-regal-navy">{item.phrase}</span>
              <span className="text-xs text-regal-navy/50">{item.category}</span>
              <button
                type="button"
                aria-label={`Remove ${item.phrase}`}
                onClick={async () => {
                  try {
                    await remove.mutateAsync(item.id);
                    toast(strings.allowlist.phraseRemoved);
                  } catch (err) {
                    toast(
                      err instanceof ApiError ? err.message : strings.errors.generic,
                      "error",
                    );
                  }
                }}
                className="rounded-full p-1 text-glaucous transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
