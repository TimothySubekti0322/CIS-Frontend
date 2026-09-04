"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { formatDate } from "@/lib/utils";
import { useAllowlistAccount, useNetworkAccount } from "@/lib/hooks/useNetworks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { PostRow } from "./ContentClusters";
import { AllowlistForm, type AllowlistDraft } from "./AllowlistForm";
import { formatValue, humanise } from "./format";

/**
 * The per-account drawer.
 *
 * This component exists so no account appears in a network without a
 * viewable reason: the connecting-edges block below names the specific
 * edges, with their per-signal weights, that placed this account in the
 * cluster.
 */
export function AccountDrawer({
  networkId,
  accountId,
  onClose,
}: {
  networkId: string;
  accountId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data, isPending, isError } = useNetworkAccount(networkId, accountId);
  const allowlist = useAllowlistAccount(networkId);
  const [declaring, setDeclaring] = useState(false);

  async function submitAllowlist(draft: AllowlistDraft) {
    if (!accountId) return;
    try {
      const result = await allowlist.mutateAsync({ accountId, ...draft });
      toast(
        result.exportedReportsAffected.length > 0
          ? `${strings.networks.allowlistDone}. ${strings.networks.allowlistRetroactive}`
          : strings.networks.allowlistDone,
      );
      setDeclaring(false);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={Boolean(accountId)}
      onClose={onClose}
      title={strings.networks.accountDrawerTitle}
      className="max-w-2xl"
    >
      {isPending ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-sea-green" aria-label="Loading" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-regal-navy/60">{strings.errors.notFound}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-h3">{data.account.handle}</span>
            <StatusPill tone="muted">{data.account.platform}</StatusPill>
            {data.account.allowlisted && (
              <StatusPill
                tone="success"
                icon={<ShieldCheck className="size-3" aria-hidden />}
              >
                {strings.networks.graphAllowlisted}
              </StatusPill>
            )}
          </div>

          {data.explanation && (
            <p className="rounded-lg bg-mint-cream px-3 py-2 text-sm text-regal-navy">
              {data.explanation}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Metric
              label={strings.networks.colCreated}
              value={formatDate(data.account.createdAtPlatform)}
            />
            <Metric
              label={strings.networks.colPosts}
              value={data.account.postsInCluster.toLocaleString()}
            />
            <Metric
              label={strings.networks.colDuplication}
              value={data.account.duplicationRate.toFixed(2)}
            />
            <Metric
              label={strings.networks.colCircadian}
              value={data.account.circadianCoverage.toFixed(2)}
            />
            <Metric
              label={strings.networks.colCentrality}
              value={data.account.degreeCentrality.toFixed(3)}
            />
            <Metric
              label="Eigenvector"
              value={data.account.eigenvectorCentrality.toFixed(3)}
            />
          </dl>

          {data.account.scoreContribution && (
            <div>
              <p className="text-xs font-bold text-regal-navy">
                Contribution to each cluster metric
              </p>
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-mint-cream px-3 py-2">
                {Object.entries(data.account.scoreContribution).map(
                  ([key, value]) => (
                    <div key={key} className="flex items-baseline gap-1.5">
                      <dt className="text-xs text-regal-navy/60">
                        {humanise(key)}
                      </dt>
                      <dd className="text-xs font-bold tabular-nums text-regal-navy">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </div>
          )}

          <section>
            <h3 className="text-sm font-bold text-regal-navy">
              {strings.networks.connectingEdges}
            </h3>
            {data.connectingEdges.length === 0 ? (
              <p className="mt-1 text-xs text-regal-navy/60">—</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {data.connectingEdges.map((edge, i) => (
                  <li
                    key={`${edge.source}-${edge.target}-${i}`}
                    className="rounded-lg border border-pale-sky px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-regal-navy">
                      {strings.networks.edgeWeight} {edge.weight.toFixed(2)}
                    </span>
                    <span className="ml-2 text-regal-navy/60">
                      {edge.signalCount} families
                    </span>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-regal-navy/70">
                      <span>Time {edge.signals.time.toFixed(2)}</span>
                      <span>Text {edge.signals.text.toFixed(2)}</span>
                      <span>Amp {edge.signals.amp.toFixed(2)}</span>
                      <span>Meta {edge.signals.meta.toFixed(2)}</span>
                      <span>Struct {edge.signals.struct.toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-regal-navy">
              {strings.networks.accountPosts}
            </h3>
            {data.posts.length === 0 ? (
              <p className="mt-1 text-xs text-regal-navy/60">—</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {data.posts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </ul>
            )}
          </section>

          {!data.account.allowlisted &&
            (declaring ? (
              <AllowlistForm
                onSubmit={submitAllowlist}
                onCancel={() => setDeclaring(false)}
                pending={allowlist.isPending}
              />
            ) : (
              <Button variant="secondary" onClick={() => setDeclaring(true)}>
                <ShieldCheck className="size-4" aria-hidden />
                {strings.networks.allowlistAccount}
              </Button>
            ))}
        </div>
      )}
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-regal-navy/60">{label}</dt>
      <dd className="text-sm font-bold tabular-nums text-regal-navy">{value}</dd>
    </div>
  );
}
